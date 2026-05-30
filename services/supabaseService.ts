import { supabase } from '../supabaseClient.ts';
import { InventoryItem, MovementRecord, Student } from '../types.ts';
import { globalNormalize, cleanNameForMatching, areWordsSimilar } from '../utils.ts';

export const fetchInitialData = async () => {
  try {
    const [invRes, histRes, studRes] = await Promise.all([
      supabase.from('inventory').select('*'),
      supabase.from('history').select('*').order('created_at', { ascending: false }),
      supabase.from('students').select('*').order('name', { ascending: true })
    ]);
    
    if (invRes.error) throw invRes.error;

    // Si hay error de permisos (esperable en modo anónimo), devolvemos listas vacías sin lanzar excepción
    const history = histRes.error ? [] : (histRes.data as MovementRecord[]) || [];
    const students = studRes.error ? [] : (studRes.data as Student[]) || [];

    const data = {
      inventory: (invRes.data as InventoryItem[]) || [],
      history,
      students
    };

    // Resguardar una copia local en caché para soporte offline
    try {
      localStorage.setItem('oswt_offline_cache', JSON.stringify(data));
    } catch (e) {
      console.warn("No se pudo guardar la copia de seguridad offline en localStorage:", e);
    }

    return data;
  } catch (error) {
    console.warn("Error al conectar con Supabase. Intentando recuperar resguardo local offline...", error);
    // Recuperar resguardo local offline de localStorage
    try {
      const cached = localStorage.getItem('oswt_offline_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error("Error al leer el resguardo local offline:", e);
    }
    throw error;
  }
};

export const syncExcelData = async (
  mappedData: InventoryItem[], 
  onProgress: (msg: string) => void,
  studentsData?: Student[]
) => {
  onProgress("Preparando datos para la base de datos...");
  const dbItems = mappedData.map((item, idx) => {
    const { Telefono, Email, Apoderado, TelefonoApoderado, ...dbItem } = item;
    return { ...dbItem, id: String(idx + 1) };
  });

  onProgress("Sincronizando inventario en el servidor de forma segura...");
  const { error: syncError } = await supabase.rpc('rpc_sync_inventory', {
    p_items: dbItems
  });
  if (syncError) throw syncError;

  // Actualizar base de estudiantes
  let uploadStudents: any[] = [];
  if (studentsData && studentsData.length > 0) {
    onProgress("Procesando directorio oficial de estudiantes...");
    // Usar ÚNICAMENTE el listado oficial de la pestaña de estudiantes
    uploadStudents = studentsData.map((s) => {
      return {
        name: s.name.toUpperCase().trim(),
        course: s.course ? s.course.toUpperCase().trim() : 'SIN CURSO',
        instrument: s.instrument ? s.instrument.toUpperCase().trim() : '',
        phone: s.phone || '',
        email: s.email || '',
        parent_name: s.parent_name ? s.parent_name.toUpperCase().trim() : '',
        parent_phone: s.parent_phone || ''
      };
    });
  }

  if (uploadStudents.length > 0) {
    onProgress("Actualizando directorio oficial en el servidor...");
    const { error: studError } = await supabase.from('students').upsert(uploadStudents, { onConflict: 'name' });
    if (studError) console.warn("Error upserting students:", studError);

    // Depuración de estudiantes obsoletos/antiguos y duplicados preexistentes
    try {
      const { data: allDbStudents, error: fetchErr } = await supabase
        .from('students')
        .select('id, name, course, phone, email, parent_name, parent_phone');
        
      if (!fetchErr && allDbStudents) {
        const officialNormalizedNames = uploadStudents.map(s => globalNormalize(s.name));
        const idsToDelete: string[] = [];

        // 1. Identificar estudiantes que ya no figuran en la pestaña oficial del Excel
        allDbStudents.forEach((dbStudent) => {
          const normDbName = globalNormalize(dbStudent.name);
          if (!officialNormalizedNames.includes(normDbName)) {
            idsToDelete.push(dbStudent.id);
          }
        });

        // 2. Ejecutar coincidencia fuzzy sobre el resto para resolver duplicados preexistentes
        const studentGroups = new Map<string, typeof allDbStudents>();
        
        allDbStudents
          .filter(student => !idsToDelete.includes(student.id))
          .forEach(student => {
            const cleaned = cleanNameForMatching(student.name);
            if (!cleaned) return;
            
            let foundGroupKey: string | null = null;
            for (const key of studentGroups.keys()) {
              const keyWords = key.split(" ");
              const studentWords = cleaned.split(" ");
              
              if (keyWords.length >= 2 && studentWords.length >= 2) {
                if (areWordsSimilar(keyWords[0], studentWords[0]) && areWordsSimilar(keyWords[1], studentWords[1])) {
                  foundGroupKey = key;
                  break;
                }
              } else if (keyWords.length === 1 && studentWords.length === 1) {
                if (areWordsSimilar(keyWords[0], studentWords[0])) {
                  foundGroupKey = key;
                  break;
                }
              }
            }
            
            if (foundGroupKey) {
              studentGroups.get(foundGroupKey)!.push(student);
            } else {
              studentGroups.set(cleaned, [student]);
            }
          });
          
        for (const [_, group] of studentGroups.entries()) {
          if (group.length > 1) {
            let bestIndex = 0;
            let maxScore = -1;
            
            group.forEach((s, idx) => {
              let score = 0;
              if (s.phone && s.phone.trim() !== '') score += 2;
              if (s.email && s.email.trim() !== '') score += 2;
              if (s.parent_name && s.parent_name.trim() !== '') score += 1;
              if (s.parent_phone && s.parent_phone.trim() !== '') score += 1;
              score += s.name.length * 0.01;
              
              if (score > maxScore) {
                maxScore = score;
                bestIndex = idx;
              }
            });
            
            group.forEach((s, idx) => {
              if (idx !== bestIndex) {
                idsToDelete.push(s.id);
              }
            });
          }
        }
        
        if (idsToDelete.length > 0) {
          onProgress(`Depurando ${idsToDelete.length} registros duplicados u obsoletos del directorio...`);
          const { error: deleteErr } = await supabase.from('students').delete().in('id', idsToDelete);
          if (deleteErr) console.warn("Error al eliminar estudiantes obsoletos/duplicados:", deleteErr);
        }
      }
    } catch (cleanErr) {
      console.warn("Error en la depuración de estudiantes del servidor:", cleanErr);
    }
  }

  // Sincronizar estados activos desde el Historial
  onProgress("Sincronizando reportes de préstamos activos...");
  const { data: activeLoans } = await supabase
    .from('history')
    .select('*')
    .eq('status', 'en_prestamo')
    .gte('created_at', '2026-05-01');

  await supabase.from('inventory').update({ 
    Prestado: 'NO', 
    Ubicacion: 'SALA DE MÚSICA'
  }).not('id', 'is', null);

  if (activeLoans && activeLoans.length > 0) {
    onProgress(`Restaurando ${activeLoans.length} préstamos...`);
    
    for (const loan of activeLoans) {
      if (loan.serie) {
        await supabase.from('inventory')
          .update({ 
            Prestado: 'SÍ', 
            Ubicacion: 'HOGAR',
            Estudiante: loan.estudiante,
            Curso: loan.curso
          })
          .eq('Serie', loan.serie);
      } else if (loan.instrumentName && loan.estudiante) {
        await supabase.from('inventory')
          .update({ 
            Prestado: 'SÍ', 
            Ubicacion: 'HOGAR',
            Estudiante: loan.estudiante,
            Curso: loan.curso
          })
          .eq('Instrumento', loan.instrumentName)
          .eq('Estudiante', loan.estudiante);
      }
    }
  }
};

export const checkoutInstrument = async (
  id: string | number, 
  studentName: string, 
  curso: string, 
  fecha: string, 
  timeStr: string
) => {
  const { data, error } = await supabase.rpc('rpc_checkout_instrument', {
    p_instrument_id: String(id),
    p_student_name: studentName,
    p_curso: curso,
    p_fecha: fecha,
    p_time_str: timeStr
  });

  if (error) throw error;
  return data;
};

export const returnInstrument = async (
  id: string | number, 
  fecha: string,
  historyId?: string
) => {
  const { data, error } = await supabase.rpc('rpc_return_instrument', {
    p_instrument_id: String(id),
    p_fecha: fecha,
    p_history_id: historyId || null
  });

  if (error) throw error;
  return data;
};

export const clearInventoryDatabase = async () => {
  const { error } = await supabase.from('inventory').delete().neq('id', 'placeholder');
  if (error) throw error;
};

export const clearHistoryDatabase = async () => {
  const { error } = await supabase.from('history').delete().not('id', 'is', null);
  if (error) throw error;
};

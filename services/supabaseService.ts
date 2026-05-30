import { supabase } from '../supabaseClient.ts';
import { InventoryItem, MovementRecord, Student } from '../types.ts';
import { globalNormalize, cleanNameForMatching, areWordsSimilar } from '../utils.ts';

export const fetchInitialData = async () => {
  const [invRes, histRes, studRes] = await Promise.all([
    supabase.from('inventory').select('*'),
    supabase.from('history').select('*').order('created_at', { ascending: false }),
    supabase.from('students').select('*').order('name', { ascending: true })
  ]);
  
  if (invRes.error) throw invRes.error;

  // Si hay error de permisos (esperable en modo anónimo), devolvemos listas vacías sin lanzar excepción
  const history = histRes.error ? [] : (histRes.data as MovementRecord[]) || [];
  const students = studRes.error ? [] : (studRes.data as Student[]) || [];

  return {
    inventory: (invRes.data as InventoryItem[]) || [],
    history,
    students
  };
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
  onProgress("Unificando y procesando directorio de estudiantes...");
  const studentsMap = new Map<string, any>();

  // 1. Poblar primero con estudiantes derivados del inventario principal
  mappedData
    .filter(i => i.Estudiante && String(i.Estudiante).trim() !== '')
    .forEach((i: InventoryItem) => {
      const sName = String(i.Estudiante).toUpperCase().trim();
      const sCourse = String(i.Curso || i.metadata?.Curso || i.metadata?.CURSO || 'SIN CURSO').toUpperCase().trim();
      const normalizedKey = globalNormalize(sName);

      studentsMap.set(normalizedKey, {
        name: sName,
        course: sCourse,
        phone: i.Telefono || '',
        email: i.Email || '',
        parent_name: i.Apoderado || '',
        parent_phone: i.TelefonoApoderado || ''
      });
    });

  // 2. Sobrescribir/unificar con el listado oficial de la pestaña de estudiantes (si existe)
  if (studentsData && studentsData.length > 0) {
    studentsData.forEach((s) => {
      const sName = s.name.toUpperCase().trim();
      const normalizedKey = globalNormalize(sName);

      const existing = studentsMap.get(normalizedKey);
      studentsMap.set(normalizedKey, {
        name: sName,
        course: s.course ? s.course.toUpperCase().trim() : (existing?.course || 'SIN CURSO'),
        instrument: s.instrument ? s.instrument.toUpperCase().trim() : (existing?.instrument || ''),
        phone: s.phone || existing?.phone || '',
        email: s.email || existing?.email || '',
        parent_name: s.parent_name ? s.parent_name.toUpperCase().trim() : (existing?.parent_name || ''),
        parent_phone: s.parent_phone || existing?.parent_phone || ''
      });
    });
  }

  const uploadStudents = Array.from(studentsMap.values());

  if (uploadStudents.length > 0) {
    onProgress("Actualizando directorio en el servidor...");
    const { error: studError } = await supabase.from('students').upsert(uploadStudents, { onConflict: 'name' });
    if (studError) console.warn("Error upserting students:", studError);
  }

  // 3. Limpieza automática de registros de estudiantes duplicados preexistentes en la base de datos
  try {
    const { data: allDbStudents, error: fetchErr } = await supabase
      .from('students')
      .select('id, name, course, phone, email, parent_name, parent_phone');
      
    if (!fetchErr && allDbStudents) {
      // Agrupar estudiantes por similitud de nombre
      const studentGroups = new Map<string, typeof allDbStudents>();
      
      allDbStudents.forEach(student => {
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
      
      // Para grupos que tengan más de un registro, conservar solo el más completo/oficial
      const idsToDelete: string[] = [];
      for (const [_, group] of studentGroups.entries()) {
        if (group.length > 1) {
          let bestIndex = 0;
          let maxScore = -1;
          
          group.forEach((s, idx) => {
            let score = 0;
            // Incrementar puntuación según los datos de contacto que tenga rellenados
            if (s.phone && s.phone.trim() !== '') score += 2;
            if (s.email && s.email.trim() !== '') score += 2;
            if (s.parent_name && s.parent_name.trim() !== '') score += 1;
            if (s.parent_phone && s.parent_phone.trim() !== '') score += 1;
            // Un pequeño beneficio adicional para nombres más largos (generalmente el nombre oficial completo)
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
        onProgress(`Limpiando ${idsToDelete.length} registros de estudiantes duplicados...`);
        const { error: deleteErr } = await supabase.from('students').delete().in('id', idsToDelete);
        if (deleteErr) console.warn("Error al eliminar estudiantes duplicados:", deleteErr);
      }
    }
  } catch (cleanErr) {
    console.warn("Error en la rutina de limpieza de estudiantes duplicados:", cleanErr);
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

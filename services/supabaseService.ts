import { supabase } from '../supabaseClient.ts';
import { InventoryItem, MovementRecord, Student } from '../types.ts';
import { globalNormalize } from '../utils.ts';

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

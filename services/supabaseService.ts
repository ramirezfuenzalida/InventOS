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
  if (histRes.error) throw histRes.error;
  if (studRes.error) throw studRes.error;

  return {
    inventory: (invRes.data as InventoryItem[]) || [],
    history: (histRes.data as MovementRecord[]) || [],
    students: (studRes.data as Student[]) || []
  };
};

export const syncExcelData = async (
  mappedData: InventoryItem[], 
  onProgress: (msg: string) => void
) => {
  onProgress("Sincronizando base de datos...");
  const { error: delError } = await supabase.from('inventory').delete().neq('id', 'placeholder');
  if (delError) throw delError;

  onProgress(`Insertando ${mappedData.length} registros...`);
  const { error: invError } = await supabase.from('inventory').insert(
    mappedData.map((item, idx) => ({ ...item, id: String(idx + 1) }))
  );
  if (invError) throw invError;

  // Actualizar base de estudiantes
  const uploadStudents = Array.from(new Map(mappedData
    .filter(i => i.Estudiante && String(i.Estudiante).trim() !== '')
    .map((i: InventoryItem) => {
      const sName = String(i.Estudiante).toUpperCase().trim();
      const sCourse = String(i.Curso || i.metadata?.Curso || i.metadata?.CURSO || 'SIN CURSO').toUpperCase().trim();
      return [globalNormalize(sName), {
        name: sName,
        course: sCourse,
        phone: i.Telefono || '',
        email: i.Email || '',
        parent_name: i.Apoderado || '',
        parent_phone: i.TelefonoApoderado || ''
      }];
    })
  ).values());

  if (uploadStudents.length > 0) {
    onProgress("Actualizando directorio...");
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

import { supabase } from '../supabaseClient.ts';
import { InventoryItem, MovementRecord, Student } from '../types.ts';
import { globalNormalize } from '../utils.ts';

export const fetchInitialData = async () => {
  const [invRes, histRes, studRes] = await Promise.all([
    supabase.from('inventory').select('*'),
    supabase.from('history').select('*').order('created_at', { ascending: false }),
    supabase.from('students').select('*').order('name', { ascending: true })
  ]);
  
  return {
    inventory: invRes.data as InventoryItem[] || [],
    history: histRes.data as MovementRecord[] || [],
    students: studRes.data as Student[] || []
  };
};

export const syncExcelData = async (
  mappedData: InventoryItem[], 
  onProgress: (msg: string) => void
) => {
  onProgress("Sincronizando base de datos...");
  // Nota: A nivel enterprise, esto se hace con un RPC (Stored Procedure) para asegurar 
  // transaccionalidad. Aquí replicamos la lógica original pero extraída.
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
    .map((i: any) => {
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
  timeStr: string,
  selectedItem: InventoryItem | undefined
) => {
  const [year, month] = fecha.split('-').map(Number);
  const updatedItem = { Estudiante: studentName, Curso: curso, Prestado: 'SÍ', Ubicacion: 'HOGAR', FechaSalida: fecha, HoraSalida: timeStr };

  const newHistoryRecord: MovementRecord = {
    id: Math.random().toString(36).substr(2, 9),
    instrumentId: id,
    instrumentName: selectedItem?.Instrumento || '',
    serie: selectedItem?.Serie || '',
    marca: selectedItem?.Marca || '',
    estudiante: studentName,
    curso: curso,
    fechaSalida: fecha,
    horaSalida: timeStr,
    status: 'en_prestamo',
    mes: month - 1,
    anio: year
  };

  const p1 = supabase.from('inventory').update({ ...updatedItem, id: String(id) }).eq('id', String(id));
  const p2 = supabase.from('history').insert({ ...newHistoryRecord, instrumentId: String(id) });
  const p3 = supabase.from('students').upsert({ name: studentName.toUpperCase(), course: curso.toUpperCase() }, { onConflict: 'name' });
  
  await Promise.all([p1, p2, p3]);

  return { updatedItem, newHistoryRecord };
};

export const returnInstrument = async (
  id: string | number, 
  fecha: string,
  historyId?: string
) => {
  const updatedItem = { Prestado: 'NO', Ubicacion: 'SALA DE MÚSICA', FechaRetorno: fecha, Estudiante: '', Curso: '' };

  const p1 = supabase.from('inventory').update({ ...updatedItem, id: String(id) }).eq('id', String(id));
  const p2 = historyId 
    ? supabase.from('history').update({ fechaRetorno: fecha, status: 'completado' }).eq('id', historyId)
    : Promise.resolve();

  await Promise.all([p1, p2]);

  return updatedItem;
};

export const clearInventoryDatabase = async () => {
  const { error } = await supabase.from('inventory').delete().neq('id', 'placeholder');
  if (error) throw error;
};

export const clearHistoryDatabase = async () => {
  const { error } = await supabase.from('history').delete().not('id', 'is', null);
  if (error) throw error;
};

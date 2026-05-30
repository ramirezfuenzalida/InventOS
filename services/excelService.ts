import { InventoryItem, Student } from '../types.ts';
import { globalNormalize } from '../utils.ts';
import { inventoryItemSchema } from '../schemas/inventory.schema.ts';
import { studentSchema } from '../schemas/student.schema.ts';

export interface ExcelParseResult {
  success: boolean;
  data?: InventoryItem[];
  students?: Student[];
  errors?: string[];
}

export const processExcelFile = async (file: File): Promise<ExcelParseResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) {
          resolve({ success: false, errors: ['No se pudo leer el contenido del archivo.'] });
          return;
        }

        // Dynamic import to prevent blocking the initial render
        const XLSX = await import('xlsx');
        
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Find inventory sheet (first sheet)
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        // Find students sheet (if any)
        const studentSheetName = wb.SheetNames.find(name => {
          const n = globalNormalize(name).replace(/\s+/g, '');
          return n === 'listadodeestudiante' || n === 'listadodeestudiantes' || n === 'estudiantes' || n === 'alumnos';
        });

        let parsedStudents: Student[] = [];
        if (studentSheetName) {
          const studentWs = wb.Sheets[studentSheetName];
          const rawStudents = XLSX.utils.sheet_to_json<Record<string, unknown>>(studentWs);
          parsedStudents = rawStudents.map((row) => {
            const name = String(row.nombre_completo || row.nombre || row.name || row.estudiante || '').replace(/_/g, ' ').toUpperCase().trim();
            const course = String(row.curso || row.grade || row.course || 'SIN CURSO').toUpperCase().trim();
            const instrument = row.instrumento || row.instrument || null;
            const phone = row.telefono_estudiante || row.telefono || row.phone || null;
            const email = row.email_estudiante || row.email || row.correo || null;
            const parentName = row.nombre_apoderado || row.apoderado || row.parent || null;
            const parentPhone = row.telefono_apoderado || row.phone_apoderado || null;

            return {
              id: String(row.rut || row.id || '').trim(),
              name,
              course,
              instrument: instrument ? String(instrument).trim() : null,
              phone: phone ? String(phone).trim() : null,
              email: email ? String(email).trim() : null,
              parent_name: parentName ? String(parentName).trim() : null,
              parent_phone: parentPhone ? String(parentPhone).trim() : null
            } as Student;
          }).filter(s => s.name !== '');
        }

        const validStudents: Student[] = [];
        parsedStudents.forEach((student, index) => {
          if (!student.id || student.id.trim() === '') {
            student.id = `temp-id-${index + 1}`;
          }
          const parseResult = studentSchema.safeParse(student);
          if (parseResult.success) {
            validStudents.push(parseResult.data);
          } else {
            validStudents.push(student);
          }
        });
        
        const mappedData: Record<string, unknown>[] = rawData.map((row, index) => {
          const mappedItem: Record<string, string> = { id: String(index + 1) };
          const standardFields: Record<string, string[]> = {
            Instrumento: ['instrumento', 'item', 'descripcion del instrumento', 'nombre del instrumento', 'instrumentos oswt'],
            Familia: ['familia', 'seccion', 'categoria', 'grupo', 'familia de instrumento'],
            Marca: ['marca', 'brand', 'fabricante'],
            Estado: ['estado', 'condicion', 'status'],
            Modelo: ['modelo', 'model'],
            Medida: ['medida', 'talla'],
            Medidas: ['medidas'],
            Serie: ['serie', 'serial', 'nro de serie'],
            TipoCase: ['case', 'estuche'],
            Accesorios: ['accesorios'],
            Soporte: ['soporte'],
            Limpio: ['limpio', 'instrumento limpio'],
            Responsable: ['monitor', 'responsable', 'monitor responsable'],
            Estudiante: ['estudiante', 'alumno', 'nombre del alumno', 'nombre', 'responsable del instrumento', 'estudiante que lo utiliza'],
            Curso: ['curso', 'grado', 'nivel', 'clase', 'ano', 'año', 'periodo', 'seccion', 'sección', 'grupo', 'estamento', 'nivel_escolar', 'aula', 'division', 'división', 'itinerario', 'paralelo', 'nivel academico', 'nivel académico', 'escolaridad', 'curso / grado'],
            Telefono: ['telefono', 'teléfono', 'celular', 'móvil', 'contacto'],
            Email: ['email', 'correo', 'mail', 'correo electrónico'],
            Apoderado: ['apoderado', 'parent', 'tutor', 'nombre apoderado'],
            TelefonoApoderado: ['teléfono apoderado', 'telefono apoderado', 'contacto apoderado', 'celular apoderado'],
            Observaciones: ['observaciones', 'notes', 'observaciones generales'],
            Ubicacion: ['ubicacion', 'sala', 'ubicacion del instrumento'],
            Prestado: ['prestado', 'hogar'],
            FechaSalida: ['fecha de salida'],
            HoraSalida: ['hora de salida'],
            FechaRetorno: ['fecha de retorno']
          };

          const metadata: Record<string, string> = {};
          const excelKeys = Object.keys(row);

          excelKeys.forEach(excelKey => {
            const normExcelKey = globalNormalize(excelKey);
            let matchedField = "";

            // First pass: look for exact matches
            for (const [field, patterns] of Object.entries(standardFields)) {
              if (patterns.some(p => normExcelKey === globalNormalize(p))) {
                matchedField = field;
                break;
              }
            }

            // Second pass: look for partial matches
            if (!matchedField) {
              const priorityOrder = ['Familia', 'Medida', 'Medidas', 'Serie', 'Estado', 'Marca', 'Modelo', 'Estudiante', 'Curso', 'Instrumento'];

              for (const field of priorityOrder) {
                const patterns = standardFields[field];
                if (patterns && patterns.some(p => normExcelKey.includes(globalNormalize(p)))) {
                  if (field === 'Estudiante' && (normExcelKey.includes('estudiante') || normExcelKey.includes('alumno'))) {
                    matchedField = 'Estudiante';
                    break;
                  }
                  matchedField = field;
                  break;
                }
              }
            }

            const rawVal = row[excelKey];
            const strVal = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';

            if (matchedField) {
              const currentVal = mappedItem[matchedField];
              const isExact = standardFields[matchedField].some(p => normExcelKey === globalNormalize(p));

              if (!currentVal || isExact) {
                mappedItem[matchedField] = strVal;
              } else {
                metadata[excelKey] = strVal;
              }
            } else {
              metadata[excelKey] = strVal;
            }
          });

          // Unify mappedItem structure with metadata
          const resultRow: Record<string, unknown> = { ...mappedItem };
          resultRow.metadata = metadata;
          return resultRow;
        }).filter(item => {
          const inst = String(item.Instrumento || '');
          const est = String(item.Estudiante || '');
          return (inst.trim() !== '' || est.trim() !== '') && inst.toLowerCase() !== 'total';
        });

        // Robust row-by-row Zod Validation
        const validRows: InventoryItem[] = [];
        const errorLogs: string[] = [];

        mappedData.forEach((row, index) => {
          const parseResult = inventoryItemSchema.safeParse(row);
          if (parseResult.success) {
            validRows.push(parseResult.data);
          } else {
            parseResult.error.issues.forEach(issue => {
              const field = issue.path[0] || 'General';
              const rawVal = row[String(field)];
              const invalidVal = rawVal !== null && rawVal !== undefined ? String(rawVal) : 'vacío';
              errorLogs.push(`Fila ${index + 1}: El valor "${invalidVal}" en el campo "${String(field)}" es inválido (${issue.message}).`);
            });
          }
        });

        if (errorLogs.length > 0) {
          resolve({ success: false, errors: errorLogs });
        } else {
          resolve({ 
            success: true, 
            data: validRows,
            students: validStudents.length > 0 ? validStudents : undefined
          });
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          resolve({ success: false, errors: ['Error crítico al procesar el Excel: ' + error.message] });
        } else {
          resolve({ success: false, errors: ['Error desconocido al procesar el Excel.'] });
        }
      }
    };
    
    reader.onerror = () => resolve({ success: false, errors: ['Error leyendo el archivo binario.'] });
    reader.readAsBinaryString(file);
  });
};

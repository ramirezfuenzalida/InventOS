import { InventoryItem, Student } from '../types.ts';
import { globalNormalize, findOfficialStudentName } from '../utils.ts';
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

        // Obtener cabeceras reales por posición física de columna (A=0, B=1, C=2, D=3) para asegurar mapeo de Curso en Columna D
        const rowsAsArrays = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
        const headers = rowsAsArrays.length > 0 ? (rowsAsArrays[0] as string[]) : [];
        const columnDHeader = headers.length > 3 ? String(headers[3]).trim() : '';

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
            const mapped: Record<string, string | null> = {};
            const standardFields: Record<string, string[]> = {
              rut: ['rut', 'id', 'identificacion', 'cedula', 'run'],
              name: ['nombre_completo', 'nombre completo', 'nombre', 'name', 'estudiante', 'alumno'],
              course: ['curso', 'grade', 'course', 'ano', 'año', 'seccion'],
              instrument: ['instrumento', 'instrument', 'item'],
              phone: ['telefono_estudiante', 'telefono estudiante', 'telefono', 'teléfono', 'phone', 'celular', 'contacto'],
              email: ['email_estudiante', 'email estudiante', 'email', 'correo', 'mail', 'correo estudiante', 'correo_estudiante'],
              parent_name: ['nombre_apoderado', 'nombre apoderado', 'apoderado', 'parent', 'tutor'],
              parent_phone: ['telefono_apoderado', 'telefono apoderado', 'contacto apoderado', 'celular apoderado', 'phone_apoderado', 'phone apoderado']
            };

            const rowKeys = Object.keys(row);
            rowKeys.forEach(key => {
              const normKey = globalNormalize(key).replace(/\s+/g, '');
              for (const [field, patterns] of Object.entries(standardFields)) {
                if (patterns.some(p => globalNormalize(p).replace(/\s+/g, '') === normKey)) {
                  mapped[field] = String(row[key]);
                  break;
                }
              }
            });

            const name = String(mapped.name || '').replace(/_/g, ' ').toUpperCase().trim();
            const course = String(mapped.course || 'SIN CURSO').toUpperCase().trim();
            const instrument = mapped.instrument || null;
            const phone = mapped.phone || null;
            const email = mapped.email || null;
            const parentName = mapped.parent_name ? String(mapped.parent_name).toUpperCase().trim() : null;
            const parentPhone = mapped.parent_phone || null;

            return {
              id: String(mapped.rut || '').trim(),
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
        
        const officialStudentNames = validStudents.map(s => s.name);
        
        const mappedData: Record<string, unknown>[] = rawData.map((row, index) => {
          const mappedItem: Record<string, string> = { id: String(index + 1) };

          // Extraer prioritariamente la columna D física (index 3) como Curso
          let parsedCurso = '';
          if (columnDHeader && row[columnDHeader] !== undefined) {
            parsedCurso = String(row[columnDHeader]);
          } else if (row['__EMPTY_3'] !== undefined) {
            parsedCurso = String(row['__EMPTY_3']);
          } else if (row['__empty_3'] !== undefined) {
            parsedCurso = String(row['__empty_3']);
          }
          if (parsedCurso && parsedCurso.trim() !== '') {
            mappedItem.Curso = parsedCurso.trim();
          }

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
          
          if (officialStudentNames.length > 0 && resultRow.Estudiante) {
            const matchedName = findOfficialStudentName(String(resultRow.Estudiante), officialStudentNames);
            resultRow.Estudiante = matchedName;
            
            const officialStudent = validStudents.find(s => s.name === matchedName);
            if (officialStudent) {
              // Si el estudiante en el listado oficial no tiene curso asignado (o tiene SIN CURSO), 
              // pero en la columna D del listado de instrumentos sí viene su curso, 
              // enriquecemos la base de datos de estudiantes.
              if (resultRow.Curso && String(resultRow.Curso).trim() !== '' && String(resultRow.Curso).toUpperCase() !== 'SIN CURSO') {
                if (!officialStudent.course || officialStudent.course === 'SIN CURSO') {
                  officialStudent.course = String(resultRow.Curso).toUpperCase().trim();
                }
              }
              
              // Si el estudiante tiene un curso oficial válido asignado, lo respetamos
              if (officialStudent.course && officialStudent.course !== 'SIN CURSO') {
                resultRow.Curso = officialStudent.course;
              }
            }
          }

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

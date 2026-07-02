import { InventoryItem, Student } from '../types.ts';
import { globalNormalize, findOfficialStudentName } from '../utils.ts';
import { inventoryItemSchema } from '../schemas/inventory.schema.ts';
import { studentSchema } from '../schemas/student.schema.ts';

export const normalizeCourse = (val: unknown): string => {
  if (val === null || val === undefined) return "SIN CURSO";
  const s = String(val)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s || "SIN CURSO";
};

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

        // Find students sheet (if any) por nombre, sin asumir posición
        const studentSheetName = wb.SheetNames.find(name => {
          const n = globalNormalize(name).replace(/\s+/g, '');
          return n.includes('estudiante') || n.includes('alumno');
        });

        // Find inventory sheet por nombre ("Detalle de Articulos" y variantes); si no hay match,
        // usa la primera hoja que no sea la de estudiantes (fallback retrocompatible).
        const inventorySheetName = wb.SheetNames.find(name => {
          const n = globalNormalize(name).replace(/\s+/g, '');
          return n.includes('articulo') || n.includes('inventario') || n.includes('instrumento');
        }) || wb.SheetNames.find(name => name !== studentSheetName) || wb.SheetNames[0];

        const ws = wb.Sheets[inventorySheetName];
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        let parsedStudents: Student[] = [];
        if (studentSheetName) {
          const studentWs = wb.Sheets[studentSheetName];
          const rawStudents = XLSX.utils.sheet_to_json<Record<string, unknown>>(studentWs);
          parsedStudents = rawStudents.map((row) => {
            const mapped: Record<string, string | null> = {};
            const standardFields: Record<string, string[]> = {
              rut: ['rut', 'id', 'identificacion', 'cedula', 'run'],
              name: ['nombre_completo', 'nombre completo', 'nombre', 'name', 'estudiante', 'alumno'],
              course: ['curso', 'grade', 'course', 'ano', 'año', 'grado', 'nivel', 'estamento', 'nivel_escolar', 'aula', 'division', 'división', 'itinerario', 'nivel academico', 'nivel académico', 'escolaridad', 'curso / grado'],
              instrument: ['instrumento', 'instrument', 'item'],
              phone: ['telefono_estudiante', 'telefono estudiante', 'telefono', 'teléfono', 'phone', 'celular', 'contacto'],
              email: ['email_estudiante', 'email estudiante', 'email', 'correo', 'mail', 'correo estudiante', 'correo_estudiante'],
              parent_name: ['nombre_apoderado', 'nombre apoderado', 'apoderado', 'parent', 'tutor'],
              parent_phone: ['telefono_apoderado', 'telefono apoderado', 'contacto apoderado', 'celular apoderado', 'phone_apoderado', 'phone apoderado']
            };

            let extractedCurso = '';

            const rowKeys = Object.keys(row);
            rowKeys.forEach(key => {
              const normKey = globalNormalize(key).replace(/\s+/g, '');

              // Detectar Curso. Nota: NO se combina con "seccion" porque en este Excel
              // la columna "seccion" contiene la familia de instrumentos (Cuerdas,
              // Vientos, etc.), no una sección de clase; el curso ya viene completo
              // (ej. "7 BASICO A"). Combinarlo ensuciaba el curso con el grupo.
              const coursePatterns = ['curso', 'grade', 'course', 'ano', 'año', 'grado', 'nivel', 'estamento', 'nivel_escolar', 'aula', 'division', 'división', 'itinerario', 'nivel academico', 'nivel académico', 'escolaridad', 'curso / grado'];
              if (coursePatterns.some(p => globalNormalize(p).replace(/\s+/g, '') === normKey)) {
                if (!extractedCurso) {
                  extractedCurso = String(row[key] || '').trim();
                }
              }

              for (const [field, patterns] of Object.entries(standardFields)) {
                if (field === 'course') continue;
                if (patterns.some(p => globalNormalize(p).replace(/\s+/g, '') === normKey)) {
                  if (!mapped[field]) {
                    mapped[field] = String(row[key]);
                  }
                  break;
                }
              }
            });

            mapped.course = extractedCurso || 'SIN CURSO';

            const name = String(mapped.name || '').replace(/_/g, ' ').toUpperCase().trim();
            const course = normalizeCourse(mapped.course);
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

          const standardFields: Record<string, string[]> = {
            Instrumento: ['instrumento', 'item', 'descripcion del instrumento', 'nombre del instrumento', 'instrumentos oswt'],
            Familia: ['familia', 'categoria', 'familia de instrumento'],
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
            Curso: ['curso', 'grado', 'nivel', 'clase', 'ano', 'año', 'periodo', 'estamento', 'nivel_escolar', 'aula', 'division', 'división', 'itinerario', 'nivel academico', 'nivel académico', 'escolaridad', 'curso / grado'],
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

          let inventoryCurso = '';

          excelKeys.forEach(excelKey => {
            const normExcelKey = globalNormalize(excelKey);

            // Detectar Curso de Inventario (sin combinar con "seccion": ver nota en la
            // hoja de estudiantes; la sección es la familia de instrumentos, no la clase).
            const coursePatterns = ['curso', 'grado', 'nivel', 'clase', 'ano', 'año', 'periodo', 'estamento', 'nivel_escolar', 'aula', 'division', 'división', 'itinerario', 'nivel academico', 'nivel académico', 'escolaridad', 'curso / grado'];
            if (coursePatterns.some(p => normExcelKey === globalNormalize(p))) {
              if (!inventoryCurso) {
                inventoryCurso = String(row[excelKey] || '').trim();
              }
            }

            let matchedField = "";

            // First pass: look for exact matches
            for (const [field, patterns] of Object.entries(standardFields)) {
              if (field === 'Curso') continue; // Se maneja aparte
              if (patterns.some(p => normExcelKey === globalNormalize(p))) {
                matchedField = field;
                break;
              }
            }

            // Second pass: look for partial matches
            if (!matchedField) {
              // "Instrumento" va antes que "Estudiante" para que encabezados como
              // "nombre_instrumento" no caigan en Estudiante por el sinónimo genérico "nombre".
              const priorityOrder = ['Familia', 'Medida', 'Medidas', 'Serie', 'Estado', 'Marca', 'Modelo', 'Instrumento', 'Estudiante'];

              for (const field of priorityOrder) {
                const patterns = standardFields[field];
                if (!patterns || !patterns.some(p => normExcelKey.includes(globalNormalize(p)))) continue;

                // El sinónimo genérico "nombre" de Estudiante solo cuenta si el encabezado
                // realmente menciona "estudiante" o "alumno"; si no, seguimos buscando.
                if (field === 'Estudiante' && !(normExcelKey.includes('estudiante') || normExcelKey.includes('alumno'))) {
                  continue;
                }

                matchedField = field;
                break;
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

          // Curso del inventario: solo el valor del curso, sin combinar con sección.
          mappedItem.Curso = normalizeCourse(inventoryCurso || 'SIN CURSO');

          // Unify mappedItem structure with metadata
          const resultRow: Record<string, unknown> = { ...mappedItem };
          
          if (officialStudentNames.length > 0 && resultRow.Estudiante) {
            const matchedName = findOfficialStudentName(String(resultRow.Estudiante), officialStudentNames);
            resultRow.Estudiante = matchedName;
            
            const officialStudent = validStudents.find(s => s.name === matchedName);
            if (officialStudent) {
              // Si la fila del inventario trae un curso válido (no vacío ni "SIN CURSO"), lo respetamos
              // y enriquecemos/actualizamos la base de datos de estudiantes oficiales con este curso.
              if (resultRow.Curso && String(resultRow.Curso).trim() !== '' && String(resultRow.Curso).toUpperCase() !== 'SIN CURSO') {
                officialStudent.course = normalizeCourse(resultRow.Curso);
              } else {
                // Si la fila de inventario no trae curso, pero el estudiante oficial sí tiene un curso válido, lo heredamos
                if (officialStudent.course && officialStudent.course !== 'SIN CURSO') {
                  resultRow.Curso = normalizeCourse(officialStudent.course);
                }
              }
            }
          }

          if (resultRow.Curso) {
            resultRow.Curso = normalizeCourse(resultRow.Curso);
          } else {
            resultRow.Curso = 'SIN CURSO';
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

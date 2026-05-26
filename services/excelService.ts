import { InventoryItem } from '../types.ts';
import { globalNormalize } from '../utils.ts';
import { inventoryArraySchema } from '../schemas/inventory.schema.ts';

export interface ExcelParseResult {
  success: boolean;
  data?: InventoryItem[];
  errors?: string[];
}

export const processExcelFile = async (file: File): Promise<ExcelParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        // Dynamic import to prevent blocking the initial render
        const XLSX = await import('xlsx');
        
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<any>(ws);
        
        const mappedData: any[] = rawData.map((row, index) => {
          const mappedItem: any = { id: String(index) };
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

          const metadata: any = {};
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

            if (matchedField) {
              const currentVal = mappedItem[matchedField];
              const isExact = standardFields[matchedField].some(p => normExcelKey === globalNormalize(p));

              if (!currentVal || isExact) {
                mappedItem[matchedField] = String(row[excelKey] || '');
              } else {
                metadata[excelKey] = String(row[excelKey] || '');
              }
            } else {
              metadata[excelKey] = String(row[excelKey] || '');
            }
          });

          return { ...mappedItem, metadata };
        }).filter(item => (item.Instrumento || (item.Estudiante && String(item.Estudiante).trim() !== '')) && String(item.Instrumento || '').toLowerCase() !== 'total');

        // Validación Zod Enterprise
        const parseResult = inventoryArraySchema.safeParse(mappedData);
        
        if (parseResult.success) {
          resolve({ success: true, data: parseResult.data });
        } else {
          const humanErrors = parseResult.error.issues.map(issue => {
            const rowIndex = issue.path[0];
            const field = issue.path[1] || 'General';
            return `Fila ${Number(rowIndex) + 1}: Error en '${String(field)}' - ${issue.message}`;
          });
          resolve({ success: false, errors: humanErrors });
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

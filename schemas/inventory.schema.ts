import { z } from 'zod';

// Permitimos cualquier valor, pero forzamos la conversión a string
// Esto es útil porque Excel a veces devuelve números en campos de texto (ej. Serie "123")
const stringFallback = z.preprocess((val) => (val == null ? '' : String(val)), z.string());

export const inventoryItemSchema = z.object({
  id: stringFallback,
  Instrumento: stringFallback,
  Familia: stringFallback,
  Marca: stringFallback,
  Estado: stringFallback,
  Modelo: stringFallback,
  Medida: stringFallback,
  Medidas: stringFallback,
  Serie: stringFallback,
  TipoCase: stringFallback,
  Accesorios: stringFallback,
  Soporte: stringFallback,
  Limpio: stringFallback,
  Responsable: stringFallback,
  Estudiante: stringFallback,
  Curso: stringFallback,
  Observaciones: stringFallback,
  Ubicacion: stringFallback,
  Prestado: stringFallback,
  FechaSalida: stringFallback,
  HoraSalida: stringFallback,
  FechaRetorno: stringFallback,
  metadata: z.any().optional(),
}).refine(data => data.Instrumento.trim() !== '' || data.Estudiante.trim() !== '', {
  message: "El registro debe tener al menos un Instrumento o un Estudiante asignado.",
  path: ["Instrumento"]
});

export const inventoryArraySchema = z.array(inventoryItemSchema);

export type InventoryItem = z.infer<typeof inventoryItemSchema>;

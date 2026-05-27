import { z } from 'zod';

export const movementRecordSchema = z.object({
  id: z.string(),
  instrumentId: z.string().or(z.number()),
  instrumentName: z.string().default(""),
  serie: z.string().default(""),
  marca: z.string().default(""),
  estudiante: z.string().min(1, "El nombre del estudiante es obligatorio"),
  curso: z.string().default(""),
  fechaSalida: z.string(),
  horaSalida: z.string(),
  fechaRetorno: z.string().optional().nullable(),
  status: z.enum(['completado', 'en_prestamo']),
  mes: z.number().int().min(0).max(11), // 0-11
  anio: z.number().int(),
});

export const movementRecordArraySchema = z.array(movementRecordSchema);

export type MovementRecord = z.infer<typeof movementRecordSchema>;

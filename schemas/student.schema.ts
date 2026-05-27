import { z } from 'zod';

export const studentSchema = z.object({
  id: z.string().uuid().or(z.string()),
  name: z.string().min(1, "El nombre del estudiante es obligatorio"),
  course: z.string().default("SIN CURSO"),
  instrument: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().or(z.literal("")).or(z.string()).optional().nullable(),
  parent_name: z.string().optional().nullable(),
  parent_phone: z.string().optional().nullable(),
});

export const studentArraySchema = z.array(studentSchema);

export type Student = z.infer<typeof studentSchema>;

import { InventoryItem } from './schemas/inventory.schema.ts';
import { Student } from './schemas/student.schema.ts';
import { MovementRecord } from './schemas/history.schema.ts';

export type { InventoryItem, Student, MovementRecord };

export interface KPIStats {
  total: number;
  necesitaReparacion: number;
  bueno: number;
  regular: number;
  malo: number;
  enPrestamo: number;
  categorias: { name: string; value: number }[];
  estados: { name: string; count: number }[];
  monitores: { name: string; count: number }[];
}
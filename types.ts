import { InventoryItem } from './schemas/inventory.schema.ts';

export type { InventoryItem };

export interface Student {
  id: string;
  name: string;
  course: string;
  instrument?: string;
  photo_url?: string;
  phone?: string;
  email?: string;
  parent_name?: string;
  parent_phone?: string;
}

export interface MovementRecord {
  id: string;
  instrumentId: string | number;
  instrumentName: string;
  serie: string;
  marca: string;
  estudiante: string;
  curso: string;
  fechaSalida: string;
  horaSalida: string;
  fechaRetorno?: string;
  status: 'completado' | 'en_prestamo';
  mes: number; // 0-11
  anio: number;
}

export interface KPIStats {
  total: number;
  necesitaReparacion: number;
  enPrestamo: number;
  categorias: { name: string; value: number }[];
  estados: { name: string; count: number }[];
  monitores: { name: string; count: number }[];
}
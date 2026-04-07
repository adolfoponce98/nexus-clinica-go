export interface Bike {
  id: string; // Ej: 'A1', 'B2'
  x: number;  // Posición porcentual horizontal (0-100)
  y: number;  // Posición porcentual vertical (0-100)
  status: 'active' | 'maintenance';
}

export interface StudioInfo {
  name: string;
  description: string;
  address: string;
  phone: string;
  images: string[];
  bikes: Bike[];
}

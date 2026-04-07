export interface Payment {
  id: number;
  alumna: string;
  email: string;
  monto: number;
  plan: string;
  metodo: 'Efectivo' | 'Tarjeta' | 'Transferencia';
  receptor: string;
  fecha: Date;
}

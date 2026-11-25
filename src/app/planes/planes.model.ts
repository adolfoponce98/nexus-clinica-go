export interface PaqueteMemberShipModel {
  idPaquete?: string;
  name?: string;
  descripcion?: string;
  tipoMmebresia?: number;
  creditos?: number;
  precioRegular?: number;
  precioDescuento?: number;
  beneficios?: string[];
  fechaCreacion?: string;
  idAdmin?: string;
  idBranch?: string;
}

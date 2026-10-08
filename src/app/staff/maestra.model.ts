export interface TeacherResponse {
  idDocumentFirebase?: string;
  branchId?: string;
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  birthDate?: string | null;
  hireDate?: string | null;
  colorHex?: string;
  photoUrl?: string | null;
  description?: string | null;
  skills?: string[];
  tabulador?: string; // ID del tabulador asignado
}

export interface TabuladorResponse {
  id?: string;
  branchId: string;
  nombre: string;
  rangos: RangoPago[];
  createdAt?: string;
}
export interface RangoPago {
  minAlumnas: number;
  maxAlumnas: number; // o un valor alto si es "en adelante"
  montoPorHora: number;
}

export interface GetTeacherByBranchResponse {
  success: boolean;
  branchId: string;
  total: number;
  teachers: TeacherResponse[];
}
export interface GetTeacherByBranchRequest {
  branchId: string;
}

export interface RangoPago {
  minAlumnas: number;
  maxAlumnas: number;
  montoPorHora: number;
}

export interface TabuladorInfo {
  id: string;
  nombre: string;
  rangos: RangoPago[];
}

export interface HorarioNomina {
  horario: string;
  agendadas: number;
  asistidas: number;
}

export interface DesgloseDiaNomina {
  dia: string;
  horarios: HorarioNomina[];
}

export interface CoachNomina {
  idCoach: string;
  nombreCoach: string;
  clasesTotales: number;
  agendasTotales: number;
  tabuladorInfo?: TabuladorInfo; // <-- Ya viene integrado aquí
  desgloseDias: DesgloseDiaNomina[];
}

export interface NominaResponse {
  success: boolean;
  periodo: string;
  idSucursal: string;
  totalCoaches: number;
  coaches: CoachNomina[];
}

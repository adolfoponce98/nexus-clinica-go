export interface DashBoardRequest {
  email?: string;
  idSucursal: string;
  fecha?: string;
}

export interface LocationModel {
  lat: string;
  lon: string;
}

export interface TypeClassModel {
  // Define las propiedades de tus tipos de clase si las tienes
  [key: string]: any;
}

export interface MyBike {
  // Define las propiedades de tus bicis si las tienes
  [key: string]: any;
}

export interface BranchModel {
  address: string;
  createdAt: string;
  email: string;
  galery: string[];
  idBranch: string;
  location: LocationModel;
  name: string;
  phone: string;
  rating: number;
  scheduler: string;
  schedulerDay: string;
  numberStudents: number;
  numberCoach: number;
  typeClasses: TypeClassModel[];
  myBikes: MyBike[];
  myBikesNumber: number;
  schedulersStudio: string[];
  tolerance: string;
}

export interface PaqueteMemberShipModel {
  idPaquete: string;
  name: string;
  descripcion: string;
  tipoMmebresia: number;
  creditos: number;
  precioRegular: number;
  precioDescuento: number;
  beneficios: string[];
  fechaCreacion: string;
  idAdmin: string;
  idBranch: string;
}

export interface TeacherResponse {
  // Define las propiedades de tus maestros si las tienes
  [key: string]: any;
}

export interface InfoSchedulerMonthly {
  semana1: number;
  semana2: number;
  semana3: number;
  semana4: number;
  semana5: number;
}

export interface DashBoardResponse {
  email: string;
  idBranch: string;
  memberships: PaqueteMemberShipModel[];
  employees: TeacherResponse[];
  branchInfo: BranchModel;
  performance: InfoSchedulerMonthly;
  totalSubscriptions: number;
  myBikesNumber:number;
}

export interface TypeClassModel {
  name: string;
  dificultad: number; // 1, 2, 3, 4
  descripcion: string;
  duracion: string;
}


export interface TeacherModel {
  idDocumentFirebase?: string;
  branchId?: string;
  id?: string;
  name: string;
  phone: string;
  email?: string;
  birthDate?: string;
  hireDate?: string;
  colorHex: string;
  photoUrl?: string;
  description?: string;
  skills: string[];
}
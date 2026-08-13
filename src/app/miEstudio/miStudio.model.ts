export interface LocationModel {
  lat: string;
  lon: string;
}

export interface InfoSchedulerMonthly {
  semana1: number;
  semana2: number;
  semana3: number;
  semana4: number;
  semana5: number;
}

// Nota: Asegúrate de tener definidas previamente estas interfaces si las requieres:
// export interface TypeClassModel { ... }
// export interface MyBike { ... }

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
  typeClasses: any[]; // Cambiar 'any[]' por TypeClassModel[] si ya cuentas con el modelo
  myBikes: any[];    // Cambiar 'any[]' por MyBike[] si ya cuentas con el modelo
  myBikesNumber: number;
  schedulersStudio: string[];
  tolerance: string;
}
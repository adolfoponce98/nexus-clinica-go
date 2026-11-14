import { Routes,CanActivateFn,Router } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MainLayoutComponent } from './main/main-layout.component'; // El componente contenedor que creamos
import { HomeComponent } from './home/home.component';
import { GastosComponent } from './gastos/gastos.component';
import { AlumnosComponent } from './alumnas/alumnas.component';
import { StudentDetailComponent } from './alumnas/detalle_alumna.component';
import { StaffComponent } from './staff/maestras.component';
import { PlansComponent } from './planes/planes.component';
import { PagosComponent } from './pagos/pagos.component';
import { SucursalComponent } from './miEstudio/studio.component';
import { CalendarComponent } from './calendar/calendar.component';
import { ServiciosConsultorioComponent } from './services/doctor_services.component';
import { ServiciosComponent } from './services/servicios.component';
import { UsersSystemComponent } from './usuariosSistema/usuarios_sistema.component';
import { MedicalRecordFormComponent } from './expediente/traumatologic/medical-record-form.component';
import { ClinicalHistoryComponent } from './patient/clinical-history.component';
import { MedicalFollowupComponent } from './expediente/traumatologic/follow/new//medical-followup.component';
import { DoctorProfileContainerComponent } from './profile/doctor-profile-container.component';
import { DoctorRegisterComponent } from './register/doctor-register.component';
import { RecetaMedicaComponent } from './recipes/receta-medica.component';
import { ListaPacientesComponent } from './patient/patient-list/lista-pacientes.component';
import { ClinicsComponent } from './consultorios/clinics-tab.component';
import { MedicalFollowupContainerComponent } from './expediente/baseFollow/medical-followup-container.component';
import { MedicalRecordContainerComponent } from './expediente/medical-record-container.component';
import { MedicalFollowupDetailContainerComponent } from './expediente/baseFollowDetail/medical-followup-detail-container.component';
import { EmployeesComponent } from './employes/employees-tab.component';
import { AuthService } from './auth/auth.service';
import { inject } from '@angular/core';
// Protege rutas privadas
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

// Protege el login (Si ya estás logueado, no te deja volver al login)
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return !authService.isLoggedIn() ? true : router.createUrlTree(['/home']);
};


export const routes: Routes = [
  // Ruta pública (Sin sidebar)
  { path: 'login', component: LoginComponent ,
     canActivate: [guestGuard] // Solo entra si NO hay sesión
  },
   { path: 'register', component: DoctorRegisterComponent ,

  },

  // Rutas protegidas que se renderizan DENTRO del MainLayoutComponent (Con sidebar)
  {
    path: '',
    component: MainLayoutComponent,
     canActivate: [authGuard], // Solo entra si HAY sesión
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'dashboard', component: HomeComponent },

      { path: 'expediente/nuevo', component: MedicalRecordContainerComponent },
      { path: 'usuarios_sistema', component: UsersSystemComponent },
      { path: 'expediente/:id', component: ClinicalHistoryComponent },
      { path: 'expediente/nuevaRevision/:id', component: MedicalFollowupContainerComponent },
      { path: 'seguimiento', component: MedicalFollowupComponent },
      { path: 'pacientes', component: ListaPacientesComponent },
      { path: 'register', component: DoctorRegisterComponent },
      { path: 'recetas', component: RecetaMedicaComponent },
      { path: 'planes', component: PlansComponent },
      { path: 'calendario', component: CalendarComponent },
       { path: 'employes', component: EmployeesComponent },
      { path: 'profile', component: DoctorProfileContainerComponent },
      { path: 'sucursales', component: SucursalComponent },
        { path: 'services', component: ServiciosConsultorioComponent },

       { path: 'consultorios', component: ClinicsComponent },
     { path: 'expediente/detail/:id/:expedienteId/:followUpId', component: MedicalFollowupDetailContainerComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },

  // Ruta comodín para redirigir URLs inválidas
  { path: '**', redirectTo: 'login' }
];

import { Routes,CanActivateFn,Router } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MainLayoutComponent } from './main/main-layout.component'; // El componente contenedor que creamos
import { HomeComponent } from './home/home.component';
import { StudentsComponent } from './alumnas/alumnas.component';
import { StudentDetailComponent } from './alumnas/detalle_alumna.component';
import { StaffComponent } from './staff/maestras.component';
import { PlansComponent } from './planes/planes.component';
import { PagosComponent } from './pagos/pagos.component';
import { SucursalComponent } from './miEstudio/studio.component';
import { CalendarComponent } from './calendar/calendar.component';
import { HeartMonitorComponent } from './monitor/heart-monitor.component';
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

  // Rutas protegidas que se renderizan DENTRO del MainLayoutComponent (Con sidebar)
  {
    path: '',
    component: MainLayoutComponent,
     canActivate: [authGuard], // Solo entra si HAY sesión
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'students', component: StudentsComponent },
      { path: 'students/:id', component: StudentDetailComponent },
      { path: 'monitor', component: HeartMonitorComponent },
      { path: 'staff', component: StaffComponent },
      { path: 'planes', component: PlansComponent },
      { path: 'calendario', component: CalendarComponent },
      { path: 'pagos', component: PagosComponent },
      { path: 'sucursales', component: SucursalComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },

  // Ruta comodín para redirigir URLs inválidas
  { path: '**', redirectTo: 'login' }
];

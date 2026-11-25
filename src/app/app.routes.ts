import { ChangePasswordComponent } from './clinical/change-password.component';
import { OfficeSyncService } from './auth/office-sync.service';
import { ConnectedDevicesComponent } from './profile/tabs/connected-devices.component';
import { PermissionService } from './auth/permission.service';
import { CanActivateChildFn } from '@angular/router';
import { Component } from '@angular/core';
import { ReportsComponent } from './reporting/reports.component';
import { AppointmentHistoryComponent } from './appointment-history/appointment-history.component';
import { Routes, CanActivateFn, Router } from '@angular/router';
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
export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  if (authService.getSession()?.mustChangePassword && state.url !== '/cambiar-contrasena')
    return inject(Router).createUrlTree(['/cambiar-contrasena']);
  const router = inject(Router);
  return (await authService.ensureSession()) ? true : router.createUrlTree(['/login']);
};

// Protege el login (Si ya estÃ¡s logueado, no te deja volver al login)
export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return !(await authService.ensureSession()) ? true : router.createUrlTree(['/home']);
};

export const permissionGuard: CanActivateChildFn = async (_route, state) => {
  const permissions = inject(PermissionService),
    router = inject(Router),
    sync = inject(OfficeSyncService),
    auth = inject(AuthService);
  if (!permissions.routeAllowed(state.url)) return router.createUrlTree([permissions.firstRoute()]);
  // These views render skeletons and resolve office context before requesting their data.
  const path = state.url.split(/[?#]/)[0];
  if (path !== '/home' && path !== '/calendario') await sync.ensureOfficeContext().catch(() => {});
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};
@Component({
  standalone: true,
  template:
    '<main class="p-8"><h1 class="text-xl font-bold">Sin acceso autorizado</h1><p>Solicita al administrador los permisos necesarios para continuar.</p><button (click)="logout()" class="border rounded-xl px-4 py-2 mt-4">Cerrar sesiÃ³n</button></main>',
})
export class NoAccessComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  async logout() {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
export const pricingOwnerGuard: CanActivateFn = () => {
  const session = inject(AuthService).getSession();
  const permissions = inject(PermissionService);
  return session && !session.idDoctor && Number(session.typeUser ?? session.role) === 1
    ? true
    : inject(Router).createUrlTree([permissions.firstRoute()]);
};
export const routes: Routes = [
  {
    path: 'recuperar-contrasena',
    loadComponent: () =>
      import('./password-recovery/password-recovery.component').then(
        (m) => m.PasswordRecoveryComponent,
      ),
  },
  {
    path: 'aviso-de-privacidad',
    loadComponent: () =>
      import('./privacy-notice/privacy-notice.component').then((m) => m.PrivacyNoticeComponent),
  },
  {
    path: 'autogestion/:token',
    loadComponent: () =>
      import('./patient-registration/public-registration.component').then(
        (m) => m.PublicRegistrationComponent,
      ),
  },
  { path: 'cambiar-contrasena', component: ChangePasswordComponent, canActivate: [authGuard] },
  // Ruta pÃºblica (Sin sidebar)
  { path: 'sin-acceso', component: NoAccessComponent },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard], // Solo entra si NO hay sesiÃ³n
  },
  { path: 'register', component: DoctorRegisterComponent },

  // Rutas protegidas que se renderizan DENTRO del MainLayoutComponent (Con sidebar)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [permissionGuard], // Solo entra si HAY sesiÃ³n
    children: [
      { path: 'home', component: HomeComponent },
      {
        path: 'notificaciones',
        loadComponent: () =>
          import('./notifications/notifications-page.component').then(
            (m) => m.NotificationsPageComponent,
          ),
      },
      { path: 'reportes/:type', component: ReportsComponent },
      {
        path: 'pacientes-atendidos',
        component: AppointmentHistoryComponent,
        data: { view: 'patients' },
      },
      { path: 'citas', component: AppointmentHistoryComponent, data: { view: 'appointments' } },
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
      {
        path: 'configuracion-precios',
        canActivate: [pricingOwnerGuard],
        loadComponent: () =>
          import('./planes/pricing-catalog.component').then((m) => m.PricingCatalogComponent),
      },
      {
        path: 'planes/resultado',
        loadComponent: () =>
          import('./planes/payment-result.component').then((m) => m.PaymentResultComponent),
      },
      { path: 'calendario', component: CalendarComponent },
      { path: 'employes', component: EmployeesComponent },
      { path: 'profile', component: DoctorProfileContainerComponent },
      { path: 'dispositivos', component: ConnectedDevicesComponent },
      { path: 'sucursales', component: SucursalComponent },
      { path: 'services', component: ServiciosConsultorioComponent },

      { path: 'consultorios', component: ClinicsComponent },
      {
        path: 'expediente/detail/:id/:expedienteId/:followUpId',
        component: MedicalFollowupDetailContainerComponent,
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

  // Ruta comodÃ­n para redirigir URLs invÃ¡lidas
  { path: '**', redirectTo: 'login' },
];

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'cliniq-go-session';
  private readonly STORAGE_SUCURSAL = 'cliniq-go-sucursal_data';
  private readonly STORAGE_PATIENTS = 'cliniq-go-patients_cache';
  private readonly STORAGE_SYNC_DATE = 'cliniq-go-patients_sync_date';

  // 🆕 Nuevas constantes para el manejo local de próximas citas
  private readonly STORAGE_APPOINTMENTS = 'cliniq-go-appointments_cache';
  private readonly STORAGE_APPOINTMENTS_SYNC_DATE = 'cliniq-go-appointments_sync_date';
  // 🆕 Constante para la caché del listado completo de consultorios
  private readonly STORAGE_ALL_BRANCHES = 'cliniq-go-all_branches_cache';
  
  // 🆕 Constante para almacenar localmente el token FCM del navegador
  private readonly STORAGE_FCM_TOKEN = 'cliniq-go-fcm_token';

  private appointmentsUpdatedSource = new Subject<void>();
  appointmentsUpdated$ = this.appointmentsUpdatedSource.asObservable();

  private branchChangedSource = new Subject<string>();
  branchChanged$ = this.branchChangedSource.asObservable();

  // 🆕 Actualizar los servicios dentro de la sucursal activa actual
  saveServicesToActiveSucursal(services: any[]) {
    const sucursal = this.getSucursal();
    if (sucursal) {
      sucursal.services = services;
      this.saveSucursal(sucursal);
    }
  }

  // 🆕 Actualizar los servicios dentro de un consultorio específico en la lista general de sucursales
  updateServicesInBranch(branchId: string, services: any[]) {
    const branches = this.getAllBranches();
    const updatedBranches = branches.map(b => {
      const currentId = b.idConsultorio || b.id;
      if (currentId === branchId) {
        return { ...b, services: services };
      }
      return b;
    });
    this.saveAllBranches(updatedBranches);
  }

  notifyAppointmentsUpdated() {
    this.appointmentsUpdatedSource.next();
  }

  // 🆕 Guardar el listado completo de consultorios
  saveAllBranches(branches: any[]) {
    localStorage.setItem(this.STORAGE_ALL_BRANCHES, JSON.stringify(branches));
  }

  // 🆕 Obtener el listado completo de consultorios de la caché
  getAllBranches(): any[] {
    const data = localStorage.getItem(this.STORAGE_ALL_BRANCHES);
    return data ? JSON.parse(data) : [];
  }

  // 🔄 Sustituye este método en tu AuthService
  saveCachedAppointments(appointments: any[], overwrite: boolean = false) {
    console.log(appointments);
    if (overwrite) {
      // Si se indica overwrite (útil para borrados o reemplazos limpios), guardamos la lista tal cual
      localStorage.setItem(this.STORAGE_APPOINTMENTS, JSON.stringify(appointments));
    } else {
      // Comportamiento de fusión anterior
      const currentCached = this.getCachedAppointments();
      const mergedMap = new Map();
      [...currentCached, ...appointments].forEach(app => {
        const key = app.syncId || app.id;
        mergedMap.set(key, app);
      });
      const combinedList = Array.from(mergedMap.values());
      localStorage.setItem(this.STORAGE_APPOINTMENTS, JSON.stringify(combinedList));

      if (appointments.length > 0) {
        const latest = appointments[appointments.length - 1];
        const newSyncValue = latest.syncId || new Date().toISOString();
        localStorage.setItem(this.STORAGE_APPOINTMENTS_SYNC_DATE, newSyncValue);
      }
    }

    // 🚀 Notificar a todos los componentes suscritos que la caché cambió
    this.notifyAppointmentsUpdated();
  }

  clearBranchCache() {
    localStorage.removeItem(this.STORAGE_PATIENTS);
    localStorage.removeItem(this.STORAGE_SYNC_DATE);
    localStorage.removeItem(this.STORAGE_APPOINTMENTS);
    localStorage.removeItem(this.STORAGE_APPOINTMENTS_SYNC_DATE);
    // Nota: Mantenemos STORAGE_KEY (sesión) y STORAGE_SUCURSAL (se actualizará con la nueva)
  }

  getCachedAppointments(): any[] {
    const data = localStorage.getItem(this.STORAGE_APPOINTMENTS);
    return data ? JSON.parse(data) : [];
  }

  getLastSyncDateAppointments(): string {
    return localStorage.getItem(this.STORAGE_APPOINTMENTS_SYNC_DATE) || '';
  }

  // Guardar datos tras el login
  saveSession(userData: any) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userData));
  }

  saveSucursal(userData: any) {
    localStorage.setItem(this.STORAGE_SUCURSAL, JSON.stringify(userData));
    const branchId = userData?.idConsultorio || userData?.id;
    if (branchId) {
      this.branchChangedSource.next(branchId);
    }
  }

  getSucursal() {
    const data = localStorage.getItem(this.STORAGE_SUCURSAL);
    return data ? JSON.parse(data) : null;
  }

  // 🔄 Actualizar únicamente el token de la sesión existente manteniendo el resto de datos
  updateSessionToken(newToken: string) {
    const currentSession = this.getSession();
    if (currentSession) {
      currentSession.sessionToken = newToken; // Actualiza solo el campo del JWT
      this.saveSession(currentSession);
    }
  }

  updateSessionTokens(newToken: string, newRefreshToken: string) {
    const currentSession = this.getSession();
    if (currentSession) {
      currentSession.sessionToken = newToken;
      currentSession.refreshToken = newRefreshToken; // Actualiza el refresh token rotado
      this.saveSession(currentSession);
    }
  }

  // 🆕 Gestión local del Token FCM
  saveFcmToken(token: string) {
    localStorage.setItem(this.STORAGE_FCM_TOKEN, token);
  }

  getFcmToken(): string | null {
    return localStorage.getItem(this.STORAGE_FCM_TOKEN);
  }

  // 🔄 Gestión de caché de pacientes y fecha de sincronización
  saveCachedPatients(patients: any[]) {
    localStorage.setItem(this.STORAGE_PATIENTS, JSON.stringify(patients));
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 19).replace('T', ' '); // Formato: YYYY-MM-DD HH:MM:SS
    localStorage.setItem(this.STORAGE_SYNC_DATE, formattedDate);
  }

  getCachedPatients(): any[] {
    const data = localStorage.getItem(this.STORAGE_PATIENTS);
    return data ? JSON.parse(data) : [];
  }

  getLastSyncDatePatients(): string {
    return localStorage.getItem(this.STORAGE_SYNC_DATE) || ''; // Si está vacío, el servidor sabrá que debe mandar todo
  }

  // Obtener datos para otros servicios
  getSession() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  // Verificar si hay sesión activa
  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.STORAGE_KEY);
  }

  // Logout
  logout() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.STORAGE_PATIENTS);
    localStorage.removeItem(this.STORAGE_SUCURSAL);
    localStorage.removeItem(this.STORAGE_SYNC_DATE);
    localStorage.removeItem(this.STORAGE_ALL_BRANCHES);
    localStorage.removeItem(this.STORAGE_APPOINTMENTS);
    localStorage.removeItem(this.STORAGE_APPOINTMENTS_SYNC_DATE);
    localStorage.removeItem(this.STORAGE_FCM_TOKEN);
  }
}
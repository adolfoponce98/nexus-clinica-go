import { Injectable } from '@angular/core';

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

  // 🆕 Guardar el listado completo de consultorios
  saveAllBranches(branches: any[]) {
    localStorage.setItem(this.STORAGE_ALL_BRANCHES, JSON.stringify(branches));
  }

  // 🆕 Obtener el listado completo de consultorios de la caché
  getAllBranches(): any[] {
    const data = localStorage.getItem(this.STORAGE_ALL_BRANCHES);
    return data ? JSON.parse(data) : [];
  }

  // 🆕 🔄 Gestión de caché de próximas citas y fecha de sincronización
  saveCachedAppointments(appointments: any[]) {
    const currentCached = this.getCachedAppointments();

    // Combinar nuevas citas evitando duplicados por `syncId` o `id`
    const mergedMap = new Map();
    [...currentCached, ...appointments].forEach(app => {
      const key = app.syncId || app.id;
      mergedMap.set(key, app);
    });

    const combinedList = Array.from(mergedMap.values());
    localStorage.setItem(this.STORAGE_APPOINTMENTS, JSON.stringify(combinedList));

    // Si llegaron nuevos elementos, actualizamos el sync date con el ID/fecha del más reciente
    if (appointments.length > 0) {
      const latest = appointments[appointments.length - 1];
      const newSyncValue = latest.syncId || new Date().toISOString();
      localStorage.setItem(this.STORAGE_APPOINTMENTS_SYNC_DATE, newSyncValue);
    }
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
  }
}

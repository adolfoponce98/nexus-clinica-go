import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'user_session';
  private readonly STORAGE_SUCURSAL = 'sucursal_data';

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
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getFirestore, collection, onSnapshot, Unsubscribe } from 'firebase/firestore';

export interface SystemUser {
  id?: string;
  name: string;
  email: string;
  phone: string;
  typeUser: number; // 1 = Recepción, 2 = Administración, 3 = Maestro
  password?: string;
  birthDate?: string;
  hireDate?: string;
  colorHex: string;
  photoUrl?: string;
  description?: string;
  skills?: string[];
  idSocio?: string;
  nipSocio?: string;
}

export interface UserSystemResponse {
  success: boolean;
  branchId: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersSystemService {
  private createUrl = 'https://createusersystemsucursals-rdotx3vmaq-uc.a.run.app';
  private deleteUrl = 'https://deleteusersystemsucursal-rdotx3vmaq-uc.a.run.app';

  constructor(private http: HttpClient) {}

  crearOActualizarUsuario(payload: any): Observable<UserSystemResponse> {
    return this.http.post<UserSystemResponse>(this.createUrl, payload);
  }

  eliminarUsuario(payload: { branchId: string; email: string }): Observable<UserSystemResponse> {
    return this.http.post<UserSystemResponse>(this.deleteUrl, payload);
  }

  // Escucha en tiempo real de los usuarios del sistema de la sucursal
  escucharUsuarios(branchId: string, callback: (users: SystemUser[]) => void): Unsubscribe {
    const db = getFirestore();
    const usersRef = collection(db, 'usersInSucursal', branchId, 'users');

    return onSnapshot(usersRef, (snapshot) => {
      const users: SystemUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SystemUser;
        users.push({
          ...data,
          id: docSnap.id
        });
      });
      callback(users);
    }, (error) => {
      console.error('Error al escuchar usuarios de sistema:', error);
      callback([]);
    });
  }
}

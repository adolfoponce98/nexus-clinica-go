import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserDataModelAuth {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  createBy?: string;
  typeCreation?: number;
  idSucursal?: string;
  tokenFirebase?: string;
}

export interface RegisterUserResponse {
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = 'https://register-rdotx3vmaq-uc.a.run.app';
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  asignarMembresiaAPI(url: string, body: any): Observable<any> {
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  return this.http.post<any>(url, body, { headers });
}

  constructor(private http: HttpClient) {}

  registrarAlumna(data: UserDataModelAuth): Observable<RegisterUserResponse> {
    return this.http.post<RegisterUserResponse>(this.apiUrl, data, { headers: this.headers });
  }
} // <--- Sin coma extra aquí al final

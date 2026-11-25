import { API_URLS } from '../config/api-urls';
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
  typeUser: number;
}

export interface LoginUserResponse {
  success: boolean;
  error?: string;
  typeUser: number;
}
export interface LoginUserRequest {
  email: String;
  password?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private apiUrl = API_URLS.LOGINUSERSSYSTEM;
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) {}

  login(data: LoginUserRequest): Observable<LoginUserResponse> {
    console.log(data);
    return this.http.post<LoginUserResponse>(this.apiUrl, data, { headers: this.headers });
  }
} // <--- Sin coma extra aquí al final

import { API_URLS } from '../config/api-urls';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RegistrarPagoRequest {
  branchId: string;
  monto: number;
  emailAlumno: string;
  emailRecepcion: string;
  metodoPago: string;
  concepto: string;
  conceptoPagoId: string;
}

export interface RegistrarPagoResponse {
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PagosService {
  private apiUrl = API_URLS.REGISTRARPAGO;
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) {}

  registrarPago(data: RegistrarPagoRequest): Observable<RegistrarPagoResponse> {
    return this.http.post<RegistrarPagoResponse>(this.apiUrl, data, { headers: this.headers });
  }
}

import { API_URLS } from '../config/api-urls';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  GetTeacherByBranchRequest,
  GetTeacherByBranchResponse,
  TabuladorResponse,
  NominaResponse,
} from './maestra.model';

@Injectable({
  providedIn: 'root',
})
export class MaestrasService {
  private apiUrl = API_URLS.GETEMPLOYESBYBRANCH;

  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  constructor(private http: HttpClient) {}

  obtenerMaestras(request: GetTeacherByBranchRequest): Observable<GetTeacherByBranchResponse> {
    return this.http.post<GetTeacherByBranchResponse>(this.apiUrl, request, {
      headers: this.headers,
    });
  }
  crearMaestro(payload: any): Observable<any> {
    return this.http.post(API_URLS.CREATEEMPLOYE, payload);
  }

  eliminarMaestro(payload: { branchId: string; idDocumentFirebase: string }): Observable<any> {
    return this.http.post(API_URLS.DELETEEMPLOYE, payload);
  }
  obtenerTabuladores(branchId: string): Observable<any> {
    return this.http.post(API_URLS.OBTENERTABULADORES, { branchId });
  }
  obtenerNominaMes(idSucursal: string, anio: string, mes: string): Observable<NominaResponse> {
    return this.http.post<NominaResponse>(API_URLS.OBTENERNOMINAMES, {
      idSucursal,
      anio,
      mes,
    });
  }
  guardarTabulador(payload: TabuladorResponse): Observable<any> {
    return this.http.post(API_URLS.GUARDARTABULADOR, payload);
  }

  eliminarTabulador(payload: { branchId: string; idTabulador: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/eliminar`, payload);
  }
}

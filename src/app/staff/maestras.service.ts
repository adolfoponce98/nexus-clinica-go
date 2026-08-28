import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GetTeacherByBranchRequest, GetTeacherByBranchResponse } from './maestra.model';

@Injectable({
  providedIn: 'root'
})
export class MaestrasService {
  private apiUrl = 'https://getemployesbybranch-rdotx3vmaq-uc.a.run.app';

  private headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(private http: HttpClient) {}

  obtenerMaestras(request: GetTeacherByBranchRequest): Observable<GetTeacherByBranchResponse> {
    return this.http.post<GetTeacherByBranchResponse>(this.apiUrl, request, { headers: this.headers });
  }
  crearMaestro(payload: any): Observable<any> {
    return this.http.post('https://createemploye-rdotx3vmaq-uc.a.run.app', payload);
  }

  eliminarMaestro(payload: { branchId: string, idDocumentFirebase: string }): Observable<any> {
    return this.http.post('https://deleteemploye-rdotx3vmaq-uc.a.run.app', payload);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashBoardRequest, DashBoardResponse } from './home.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'https://getbranchdashboarddata-rdotx3vmaq-uc.a.run.app';

  private headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(private http: HttpClient) {}

  obtenerInfoDashboard(request: DashBoardRequest): Observable<DashBoardResponse> {
    return this.http.post<DashBoardResponse>(this.apiUrl, request, { headers: this.headers });
  }
}

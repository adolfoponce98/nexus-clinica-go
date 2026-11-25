import { API_URLS } from '../config/api-urls';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashBoardRequest, DashBoardResponse } from './home.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = API_URLS.GETBRANCHDASHBOARDDATA;

  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  constructor(private http: HttpClient) {}

  obtenerInfoDashboard(request: DashBoardRequest): Observable<DashBoardResponse> {
    return this.http.post<DashBoardResponse>(this.apiUrl, request, { headers: this.headers });
  }
}

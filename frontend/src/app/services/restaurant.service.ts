import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Restaurant } from '../models/restaurant.model'; 
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service'; 

export interface CreateRestaurantPayloadForService {
  name: string;
  imageUrl: string;
  description?: string;
  address: {
    street: string;
    number: string; 
    apartment?: string; 
    cityId: number; 
    city?: string; 
    location: {
      lat: number;
      lng: number;
    };
  };
}


@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private baseUrl = `${environment.backendUrl}/restaurants`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido en el servicio de restaurantes.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      errorMessage = `Error del servidor (${error.status}): ${error.error?.message || error.message || JSON.stringify(error.error)}`;
    }
    console.error(`[RestaurantService] ${errorMessage}`);
    return throwError(() => new Error(errorMessage));
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json' 
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn('[RestaurantService] No se encontró token de autenticación. Las rutas protegidas requerirán un token.');
    }
    return headers;
  }

  getAll(cityId?: number, ownerUserId?: number): Observable<Restaurant[]> {
    let params = new HttpParams();
    if (cityId) {
      params = params.set('cityId', cityId.toString());
    }
    if (ownerUserId) {
      params = params.set('userId', ownerUserId.toString());
    }

    return this.http.get<Restaurant[]>(this.baseUrl, { params: params, headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getByUserId(userId: number): Observable<Restaurant[]> {
    return this.getAll(undefined, userId);
  }

  create(restaurant: CreateRestaurantPayloadForService): Observable<Restaurant> {
    return this.http.post<Restaurant>(this.baseUrl, restaurant, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  update(id: number, restaurant: CreateRestaurantPayloadForService): Observable<Restaurant> {
    return this.http.put<Restaurant>(`${this.baseUrl}/${id}`, restaurant, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  patch(id: number, partial: Partial<CreateRestaurantPayloadForService>): Observable<Restaurant> {
    return this.http.patch<Restaurant>(`${this.baseUrl}/${id}`, partial, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }
}
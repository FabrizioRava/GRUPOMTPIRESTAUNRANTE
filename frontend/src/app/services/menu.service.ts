// src/app/services/menu.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment'; // Importar environment
import { AuthService } from './auth.service'; // Importar AuthService

// Interfaz que debe coincidir con CreateMenuDto/Menu Entity del backend
export interface MenuItem {
  id?: number; // Opcional para la creación
  restaurantId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category?: string | null; // Añadido, es opcional y puede ser null
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  // Asegúrate que esta URL base apunte a tu backend
  private apiUrl = `${environment.backendUrl}/menu`; // Usar environment.backendUrl

  constructor(
    private http: HttpClient,
    private authService: AuthService // Inyectar AuthService
  ) {}

  // Manejo de errores
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido en el servicio de menús.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      errorMessage = `Error del servidor (${error.status}): ${error.error?.message || error.message || JSON.stringify(error.error)}`;
    }
    console.error(`[MenuService] ${errorMessage}`);
    return throwError(() => new Error(errorMessage));
  }

  // Método para obtener las cabeceras de autenticación
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn('[MenuService] No se encontró token de autenticación. Las rutas protegidas requerirán un token.');
    }
    return headers;
  }

  getAllMenuItems(): Observable<MenuItem[]> {
    // Los GET no requieren token si no están protegidos, pero es buena práctica incluirlos
    return this.http.get<MenuItem[]>(this.apiUrl, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getMenuItemById(id: number): Observable<MenuItem> {
    return this.http.get<MenuItem>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getMenuByRestaurantId(restaurantId: number): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.apiUrl}/restaurant/${restaurantId}`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  createMenuItem(menuItem: MenuItem): Observable<MenuItem> {
    // Las operaciones de creación, actualización y eliminación requieren autenticación
    return this.http.post<MenuItem>(this.apiUrl, menuItem, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  updateMenuItem(id: number, menuItem: MenuItem): Observable<MenuItem> {
    return this.http.put<MenuItem>(`${this.apiUrl}/${id}`, menuItem, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  patchMenuItem(id: number, partialMenuItem: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.patch<MenuItem>(`${this.apiUrl}/${id}`, partialMenuItem, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  deleteMenuItem(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }
}
// src/app/services/restaurant.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Restaurant } from '../models/restaurant.model'; // Asegúrate que la ruta a tu modelo sea correcta
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service'; // Importa tu AuthService

// Define la interfaz para los datos que se envían al backend cuando se crea/actualiza un restaurante.
// Esta interfaz debe coincidir exactamente con el 'CreateRestaurantDto' de tu backend.
// NOTA CLAVE: 'userId' ha sido ELIMINADO de esta interfaz porque el backend lo inyecta desde el token JWT.
export interface CreateRestaurantPayloadForService {
  name: string;
  imageUrl: string;
  description?: string; // Es opcional en el backend DTO
  address: {
    street: string;
    number: string; // Confirmado como string
    apartment?: string; // Opcional
    cityId: number; // Confirmado como number, debe coincidir con el backend DTO
    city?: string; // Es opcional en el backend DTO
    location: {
      lat: number;
      lng: number;
    };
  };
  // 'userId' ya NO va aquí porque el backend lo obtiene del token JWT.
  // Tu backend debe tener un decorador o interceptor para extraer el userId del JWT
  // y asignarlo al restaurante antes de guardarlo.
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
      // Errores del lado del cliente o de la red.
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      // El backend devolvió un código de respuesta de error.
      // El cuerpo de la respuesta puede contener pistas sobre lo que salió mal.
      errorMessage = `Error del servidor (${error.status}): ${error.error?.message || error.message || JSON.stringify(error.error)}`;
    }
    console.error(`[RestaurantService] ${errorMessage}`);
    // Retorna un observable con un error al componente.
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Genera los HttpHeaders con el token JWT de autenticación.
   * Asume que AuthService tiene un método `getToken()` que devuelve el token JWT o `null`.
   * Incluye 'Content-Type' para asegurar que el backend reciba JSON correctamente.
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json' // Siempre enviar como JSON
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn('[RestaurantService] No se encontró token de autenticación. Las rutas protegidas requerirán un token.');
    }
    return headers;
  }

  /**
   * Obtiene la lista de restaurantes, opcionalmente filtrados por cityId y/o ownerUserId.
   * Se incluyen las cabeceras de autenticación.
   * @param cityId El ID de la ciudad para filtrar los restaurantes (opcional).
   * @param ownerUserId El ID del usuario propietario para filtrar los restaurantes (opcional).
   * @returns Un Observable con la lista de restaurantes.
   */
  getAll(cityId?: number, ownerUserId?: number): Observable<Restaurant[]> {
    let params = new HttpParams();
    if (cityId) {
      params = params.set('cityId', cityId.toString());
    }
    // NOTA: ownerUserId se usa aquí para filtrar peticiones GET, no para enviar en POST/PUT.
    // Esto es común si quieres obtener "Mis restaurantes" o "Restaurantes en X ciudad de Y usuario".
    if (ownerUserId) {
      params = params.set('userId', ownerUserId.toString());
    }

    return this.http.get<Restaurant[]>(this.baseUrl, { params: params, headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene un restaurante por su ID.
   * @param id El ID del restaurante.
   * @returns Un Observable con el restaurante.
   */
  getById(id: number): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene los restaurantes asociados a un usuario específico.
   * Este método es un wrapper de `getAll` si tu backend permite filtrar por `userId` a través de `getAll`.
   * @param userId El ID del usuario.
   * @returns Un Observable con la lista de restaurantes del usuario.
   */
  getByUserId(userId: number): Observable<Restaurant[]> {
    return this.getAll(undefined, userId);
  }

  /**
   * Crea un nuevo restaurante.
   * El userId será gestionado por el backend desde el token JWT.
   * @param restaurant El payload del restaurante a crear (sin userId).
   * @returns Un Observable con el restaurante creado.
   */
  create(restaurant: CreateRestaurantPayloadForService): Observable<Restaurant> {
    return this.http.post<Restaurant>(this.baseUrl, restaurant, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un restaurante existente.
   * El userId para la autorización y propiedad será gestionado por el backend desde el token JWT.
   * @param id El ID del restaurante a actualizar.
   * @param restaurant El payload actualizado del restaurante (sin userId).
   * @returns Un Observable con el restaurante actualizado.
   */
  update(id: number, restaurant: CreateRestaurantPayloadForService): Observable<Restaurant> {
    return this.http.put<Restaurant>(`${this.baseUrl}/${id}`, restaurant, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Realiza una actualización parcial de un restaurante.
   * El userId para la autorización y propiedad será gestionado por el backend desde el token JWT.
   * @param id El ID del restaurante a actualizar.
   * @param partial Un objeto con las propiedades a actualizar.
   * @returns Un Observable con el restaurante actualizado.
   */
  patch(id: number, partial: Partial<CreateRestaurantPayloadForService>): Observable<Restaurant> {
    return this.http.patch<Restaurant>(`${this.baseUrl}/${id}`, partial, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un restaurante por su ID.
   * @param id El ID del restaurante a eliminar.
   * @returns Un Observable con un mensaje de confirmación.
   */
  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }
}
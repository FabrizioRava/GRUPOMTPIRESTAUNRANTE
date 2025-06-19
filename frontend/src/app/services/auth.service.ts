import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment'; 
import { Router } from '@angular/router';

// Define la interfaz para el objeto usuario simple que retorna tu backend
// AÑADIDO: cityId para el usuario
interface User {
  userId: number; 
  email: string;
  cityId: number; // <--- AÑADIDO: cityId en la interfaz User
}

// Define la interfaz para la respuesta de login de tu backend
interface LoginResponse {
  access_token: string;
  user?: User; 
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.backendUrl}/auth`;
  private tokenKey = 'jwt_token'; 
  private currentUserSubject: BehaviorSubject<User | null>; 
  public currentUser: Observable<User | null>;

  constructor(private http: HttpClient, private router: Router) {
    const initialUser = this.getDecodedToken();
    this.currentUserSubject = new BehaviorSubject<User | null>(initialUser);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Guarda el token JWT en localStorage y actualiza el estado del usuario.
   * Saves the JWT token to localStorage and updates the user's state.
   * @param token The JWT token to save. El token JWT a guardar.
   */
  private saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token); // <--- CORRECCIÓN CLAVE AQUÍ: this.tokenKey
    const decodedUser = this.getDecodedToken();
    this.currentUserSubject.next(decodedUser);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response && response.access_token) {
          this.saveToken(response.access_token);
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        if (response && response.access_token) {
          this.saveToken(response.access_token);
        }
      })
    );
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    const decoded = this.getDecodedToken();
    return !!decoded;
  }

  /**
   * Decodes the JWT token to extract user information (userId, email, cityId).
   * Decodifica el token JWT para extraer la información del usuario (userId, email, cityId).
   * @returns The decoded JWT payload as a User object, or null if no token or invalid.
   */
  private getDecodedToken(): User | null {
    const token = this.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Asegúrate que 'sub' sea el userId, 'email' el email y 'cityId' el ID de la ciudad
        // También puedes añadir validación para asegurarte de que cityId sea un número
        const cityIdValue = payload.cityId;
        const parsedCityId = typeof cityIdValue === 'number' ? cityIdValue : parseInt(cityIdValue, 10);

        return { 
          userId: payload.sub, 
          email: payload.email,
          cityId: isNaN(parsedCityId) ? 0 : parsedCityId // Asigna 0 o null si no es un número válido
        }; 
      } catch (e) {
        console.error('Error decodificando token JWT:', e);
        return null;
      }
    }
    return null;
  }

  /**
   * Gets the userId of the logged-in user.
   * Obtiene el userId del usuario logueado.
   * @returns The userId as a number, or null if not logged in or ID is not in the token.
   */
  getLoggedInUserId(): number | null {
    const decodedToken = this.getDecodedToken();
    return decodedToken ? decodedToken.userId : null;
  }

  /**
   * Gets the cityId of the logged-in user.
   * Obtiene el cityId del usuario logueado desde el token JWT.
   * @returns The cityId as a number, or null if not logged in or cityId is not in the token.
   */
  getLoggedInUserCityId(): number | null {
    const decodedToken = this.getDecodedToken();
    return decodedToken ? decodedToken.cityId : null;
  }
}

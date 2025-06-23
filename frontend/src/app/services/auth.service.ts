import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment'; 
import { Router } from '@angular/router';


interface User {
  userId: number; 
  email: string;
  cityId: number; 
}

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


  private saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token); 
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


  private getDecodedToken(): User | null {
    const token = this.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const cityIdValue = payload.cityId;
        const parsedCityId = typeof cityIdValue === 'number' ? cityIdValue : parseInt(cityIdValue, 10);

        return { 
          userId: payload.sub, 
          email: payload.email,
          cityId: isNaN(parsedCityId) ? 0 : parsedCityId 
        }; 
      } catch (e) {
        console.error('Error decodificando token JWT:', e);
        return null;
      }
    }
    return null;
  }

  getLoggedInUserId(): number | null {
    const decodedToken = this.getDecodedToken();
    return decodedToken ? decodedToken.userId : null;
  }

  getLoggedInUserCityId(): number | null {
    const decodedToken = this.getDecodedToken();
    return decodedToken ? decodedToken.cityId : null;
  }
}

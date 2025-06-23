import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service'; 

export const authGuard: CanActivateFn = (route, state) => { 
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) { 
    console.log('AuthGuard: Usuario autenticado. Acceso permitido.');
    return true;
  } else {
    console.warn('AuthGuard: Usuario no autenticado. Redirigiendo a /login.');
    router.navigate(['/login']);
    return false;
  }
};

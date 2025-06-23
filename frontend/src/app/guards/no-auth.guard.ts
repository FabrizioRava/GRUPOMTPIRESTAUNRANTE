import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service'; 

export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    console.log('NoAuthGuard: Usuario no autenticado. Acceso permitido.');
    return true;
  } else {
    console.warn('NoAuthGuard: Usuario ya autenticado. Redirigiendo a /restaurants.');
    router.navigate(['/restaurants']);
    return false;
  }
};

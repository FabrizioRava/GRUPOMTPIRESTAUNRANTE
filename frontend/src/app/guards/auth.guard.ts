// src/app/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service'; // Asegúrate de que esta ruta sea correcta

export const authGuard: CanActivateFn = (route, state) => { // ¡CAMBIO AQUÍ! Debe ser authGuard
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) { // Usamos isAuthenticated()
    console.log('AuthGuard: Usuario autenticado. Acceso permitido.');
    return true;
  } else {
    console.warn('AuthGuard: Usuario no autenticado. Redirigiendo a /login.');
    router.navigate(['/login']);
    return false;
  }
};

// src/app/guards/no-auth.guard.ts
// src/app/guards/no-auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service'; // Asegúrate de que esta ruta sea correcta

export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // ¡CAMBIO CLAVE AQUÍ! Si NO está autenticado, permite. Si SÍ está autenticado, redirige.
  if (!authService.isAuthenticated()) {
    console.log('NoAuthGuard: Usuario no autenticado. Acceso permitido.');
    return true;
  } else {
    console.warn('NoAuthGuard: Usuario ya autenticado. Redirigiendo a /restaurants.');
    router.navigate(['/restaurants']);
    return false;
  }
};

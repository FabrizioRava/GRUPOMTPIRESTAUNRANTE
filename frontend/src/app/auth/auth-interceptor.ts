// src/app/auth/auth-interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service'; // ¡CAMBIO DE RUTA AQUÍ! De './auth.service' a '../services/auth.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const authToken = authService.getToken();

  if (authToken) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`)
    });
    console.log('AuthInterceptor: Token JWT añadido a la solicitud:', authReq.url);
    return next(authReq);
  }

  console.log('AuthInterceptor: No se encontró token JWT para la solicitud:', req.url);
  return next(req);
};

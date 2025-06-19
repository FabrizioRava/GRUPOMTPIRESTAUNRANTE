// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http'; // Importa esto

import { routes } from './app.routes';
import { RestaurantService } from './services/restaurant.service';
import { AuthService } from './services/auth.service';
// No es necesario importar NominatimOsmService aquí si usa providedIn: 'root'

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(), // Habilita HttpClient en toda la aplicación
    RestaurantService,   // Provee RestaurantService globalmente
    AuthService          // Provee AuthService globalmente
  ]
};
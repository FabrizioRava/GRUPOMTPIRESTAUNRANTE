import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard'; 

export const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' }, 

  {
    path: 'auth',
    loadChildren: () => import('./pages/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },

  {
    path: 'restaurants',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/restaurant/restaurant.routes').then(m => m.RESTAURANT_ROUTES)
  },
  {
    path: 'menus',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/menu/menu.routes').then(m => m.MENU_ROUTES)
  },

  { path: '**', redirectTo: '/auth/login' }
];
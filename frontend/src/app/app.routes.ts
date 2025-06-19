import { Routes } from '@angular/router';
import { RestaurantListComponent } from './restaurant-list/restaurant-list.component';
import { RestaurantDetailComponent } from './restaurant-detail/restaurant-detail.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { MenuListComponent } from './menu/menu-list/menu-list.component';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';
import { AddRestaurantComponent } from './add-restaurant/add-restaurant.component';
import { MenuManagementComponent } from './menu/menu-management/menu-management.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'restaurants/:restaurantId/menus', // Ruta de nivel superior con parámetro de restaurante
    component: MenuManagementComponent,
    canActivate: [authGuard],
    data: { isOwnerOnly: true }
  },
  // --- COMENTA TEMPORALMENTE ESTA RUTA ---
   {
    path: 'restaurants', // Esta es la ruta general para la lista de restaurantes
     component: RestaurantListComponent,
     canActivate: [authGuard]
   },
  // --- FIN DE COMENTARIO ---
  {
    path: 'restaurant/:id', // Ruta para el detalle del restaurante
    component: RestaurantDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [noAuthGuard]
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [noAuthGuard]
  },
  {
    path: 'menu',
    component: MenuListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'add-restaurant',
    component: AddRestaurantComponent,
    canActivate: [authGuard]
  },
  {
    path: 'my-restaurants',
    component: RestaurantListComponent,
    canActivate: [authGuard],
    data: { filterByOwner: true }
  },
  {
    path: 'edit-restaurant/:id',
    component: AddRestaurantComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/login' }
];
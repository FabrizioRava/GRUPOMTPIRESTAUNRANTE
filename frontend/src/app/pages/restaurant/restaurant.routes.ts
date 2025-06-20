import { Routes } from '@angular/router';
import { RestaurantListComponent } from './restaurant-list/restaurant-list.component';
import { RestaurantDetailComponent } from './restaurant-detail/restaurant-detail.component';
import { AddRestaurantComponent } from './add-restaurant/add-restaurant.component'; // Assuming you moved it here

export const RESTAURANT_ROUTES: Routes = [
  {
    path: '', // For /restaurants
    component: RestaurantListComponent
  },
  {
    path: 'add', // <-- Mueve 'add' PRIMERO, antes de ':id'
    component: AddRestaurantComponent
  },
  {
    path: 'edit/:id', // <-- Mueve 'edit/:id' también antes de ':id'
    component: AddRestaurantComponent
  },
  {
    path: ':id', // <-- Este debe ir ÚLTIMO entre las rutas de un solo segmento
    component: RestaurantDetailComponent
  }
];
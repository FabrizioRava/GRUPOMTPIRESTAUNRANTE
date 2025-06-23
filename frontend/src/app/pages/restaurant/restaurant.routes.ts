import { Routes } from '@angular/router';
import { RestaurantListComponent } from './restaurant-list/restaurant-list.component';
import { RestaurantDetailComponent } from './restaurant-detail/restaurant-detail.component';
import { AddRestaurantComponent } from './add-restaurant/add-restaurant.component'; 

export const RESTAURANT_ROUTES: Routes = [
  {
    path: '', 
    component: RestaurantListComponent
  },
  {
    path: 'add', 
    component: AddRestaurantComponent
  },
  {
    path: 'edit/:id', 
    component: AddRestaurantComponent
  },
  {
    path: ':id', 
    component: RestaurantDetailComponent
  }
];
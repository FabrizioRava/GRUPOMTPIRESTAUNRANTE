import { Routes } from '@angular/router';
import { MenuListComponent } from './menu-list/menu-list.component';
import { MenuManagementComponent } from './menu-management/menu-management.component';

export const MENU_ROUTES: Routes = [
  {
    path: '', 
    component: MenuListComponent
  },
  {
    path: 'manage/:restaurantId', 
    component: MenuManagementComponent,
    data: { isOwnerOnly: true } 
  }
];
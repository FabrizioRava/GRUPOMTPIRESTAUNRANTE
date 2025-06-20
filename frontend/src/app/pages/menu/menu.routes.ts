import { Routes } from '@angular/router';
import { MenuListComponent } from './menu-list/menu-list.component';
import { MenuManagementComponent } from './menu-management/menu-management.component';

export const MENU_ROUTES: Routes = [
  {
    path: '', // Esto hace que /menus cargue MenuListComponent
    component: MenuListComponent
  },
  {
    path: 'manage/:restaurantId', // Esto hace que /menus/manage/:restaurantId cargue MenuManagementComponent
    // Cambié 'restaurants/:restaurantId/menus' por '/menus/manage/:restaurantId'
    // ya que ahora está anidado bajo '/menus'.
    component: MenuManagementComponent,
    data: { isOwnerOnly: true } // Mantienes tu data
  }
];
// src/app/restaurant/restaurant-detail/restaurant-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RestaurantService } from '../services/restaurant.service';
import { MenuService, MenuItem } from '../services/menu.service'; // Importar MenuItem
import { AuthService } from '../services/auth.service';
import { Restaurant } from '../models/restaurant.model';
import { LoadingSpinnerComponent } from '../shared/loading-spinner/loading-spinner.component';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [
    CommonModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './restaurant-detail.component.html',
  styleUrls: ['./restaurant-detail.component.css']
})
export class RestaurantDetailComponent implements OnInit {
  restaurant: Restaurant | null = null;
  menuItems: MenuItem[] = []; // ¡Tipado como MenuItem[]!
  isOwner: boolean = false;
  errorMessage: string | null = null;
  isLoading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private restaurantService: RestaurantService,
    private menuService: MenuService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (isNaN(id)) {
        this.errorMessage = 'ID de restaurante inválido.';
        return;
      }
      this.loadRestaurant(id);
      this.loadMenu(id);
    });
  }

  loadRestaurant(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.restaurantService.getById(id).subscribe({
      next: (res: Restaurant) => {
        this.restaurant = res;
        const loggedInUserId = this.authService.getLoggedInUserId();
        this.isOwner = loggedInUserId === this.restaurant.userId;
        this.isLoading = false;
        console.log('RDC: Restaurante cargado:', this.restaurant);
        console.log('RDC: Es propietario:', this.isOwner);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = 'Error al cargar los detalles del restaurante.';
        this.isLoading = false;
        console.error('Error cargando restaurante:', err);
        if (err.status === 404) {
          this.errorMessage = 'Restaurante no encontrado.';
        } else if (err.status === 401) {
          this.authService.logout();
        }
      }
    });
  }

  loadMenu(restaurantId: number): void {
    this.menuService.getMenuByRestaurantId(restaurantId).subscribe({
      next: (res: MenuItem[]) => { // ¡Tipado como MenuItem[]!
        this.menuItems = res;
        console.log('RDC: Menús cargados:', this.menuItems);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = 'Error al cargar los menús del restaurante.';
        console.error('Error cargando menús:', err);
      }
    });
  }

  deleteRestaurant(): void {
    // ... (tu código existente para eliminar restaurante) ...
    if (!this.restaurant || !this.isOwner) {
      this.errorMessage = 'No tienes permiso para eliminar este restaurante o el restaurante no está cargado.';
      return;
    }

    const confirmDelete = window.confirm('¿Estás seguro de que quieres eliminar este restaurante? Esta acción es irreversible.');

    if (confirmDelete) {
      this.isLoading = true;
      this.errorMessage = null;
      this.restaurantService.delete(this.restaurant.id).subscribe({
        next: () => {
          console.log('RDC: Restaurante eliminado con éxito.');
          this.isLoading = false;
          this.router.navigate(['/my-restaurants']);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage = 'Error al eliminar el restaurante.';
          console.error('Error eliminando restaurante:', err);
          if (err.status === 403) {
            this.errorMessage = 'No tienes permiso para eliminar este restaurante.';
          } else if (err.status === 404) {
            this.errorMessage = 'El restaurante ya no existe.';
          } else if (err.status === 401) {
            this.authService.logout();
          }
        }
      });
    } else {
      console.log('RDC: Eliminación cancelada por el usuario.');
    }
  }

  onEditClick(): void {
    if (this.restaurant && this.isOwner) {
      this.router.navigate(['/edit-restaurant', this.restaurant.id]);
    } else {
      this.errorMessage = 'No tienes permiso para editar este restaurante o el restaurante no está cargado.';
    }
  }

  // --- ¡ASEGÚRATE DE QUE ESTE MÉTODO ESTÉ EN TU ARCHIVO TS! ---
  onManageMenuClick(): void {
  if (this.restaurant && this.isOwner) {
    // --- ¡AÑADE ESTA LÍNEA AQUÍ! ---
    console.log('DEBUG: Navegando para gestionar menú del restaurante ID:', this.restaurant.id);
    // ---------------------------------
    this.router.navigate(['/restaurants', this.restaurant.id, 'menus']);
  } else {
    this.errorMessage = 'No tienes permiso para gestionar el menú de este restaurante o el restaurante no está cargado.';
  }
}

  // --- FIN DEL MÉTODO ---
}
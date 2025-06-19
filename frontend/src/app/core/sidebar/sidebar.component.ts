// src/app/core/sidebar/sidebar.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router'; 
import { AuthService } from '../../services/auth.service'; // Importar AuthService

@Component({
  selector: 'app-sidebar',
  standalone: true, 
  imports: [
    CommonModule, 
    // Si usas routerLink en el HTML del sidebar, también necesitarías RouterModule
    // RouterModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() isOpen: boolean = false;
  @Output() closeSidebar = new EventEmitter<void>();
  @Output() logoutEvent = new EventEmitter<void>();

  constructor(
    private router: Router,
    private authService: AuthService // Inyectar AuthService
  ) {}

  onCloseClick() {
    this.closeSidebar.emit();
  }

  onAddRestaurantClick() {
    this.router.navigate(['/add-restaurant']); 
    this.onCloseClick();
  }

  // --- NUEVO MÉTODO PARA MIS RESTAURANTES ---
  onMyRestaurantsClick() {
    this.router.navigate(['/my-restaurants']); // Navega a la nueva ruta para Mis Restaurantes
    this.onCloseClick(); // Cierra el sidebar después de navegar
  }
  // --- FIN NUEVO MÉTODO ---

  onLogoutClick() {
    this.logoutEvent.emit();
    this.onCloseClick();
  }

  // --- NUEVA PROPIEDAD: Para controlar la visibilidad del botón "Mis Restaurantes" ---
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated(); // Retorna si el usuario está logueado
  }
  // --- FIN NUEVA PROPIEDAD ---
}


    
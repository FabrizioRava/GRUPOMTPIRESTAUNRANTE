// src/app/core/sidebar/sidebar.component.ts
import { Component, OnInit, Output, EventEmitter, OnDestroy, Input } from '@angular/core'; // <-- Importa 'Input'
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  standalone: true,
  imports: [
    CommonModule
  ]
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() closeSidebar = new EventEmitter<void>();
  @Input() isOpen: boolean = false; // <-- ¡AQUÍ ESTÁ LA CORRECCIÓN! Declaramos isOpen como Input
  isAuthenticated: boolean = false;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
  }

  ngOnDestroy(): void {
    // Si tuvieras suscripciones que limpiar, descomenta y asegúrate de que 'authStatusSubscription' esté definido
    // this.authStatusSubscription?.unsubscribe();
  }

  onCloseClick(): void {
    this.closeSidebar.emit();
  }

  onLogoutClick(): void {
    this.authService.logout();
    this.onCloseClick();
  }

  onAddRestaurantClick(): void {
    this.router.navigate(['/restaurants', 'add']);
    this.onCloseClick();
  }

  onMyRestaurantsClick(): void {
    this.router.navigate(['/restaurants'], { queryParams: { filterByOwner: true } });
    this.onCloseClick();
  }

  onViewAllRestaurantsClick(): void {
    this.router.navigate(['/restaurants']);
    this.onCloseClick();
  }
}
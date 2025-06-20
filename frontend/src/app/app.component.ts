// src/app/app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
// Importa RouterOutlet, Router y NavigationEnd
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './core/sidebar/sidebar.component';
import { AuthService } from './services/auth.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'pedidos-ya';
  isSidebarOpen = false;
  // Cambiamos el nombre a algo más descriptivo para el control del header/sidebar en general.
  // Será true para todas las rutas excepto login/registro.
  showAppHeaderAndSidebar: boolean = true;
  private routerSubscription: Subscription | undefined; // Asegúrate de que pueda ser undefined

  constructor(
    private authService: AuthService,
    private router: Router
    // ActivatedRoute no es necesario para esta lógica aquí
  ) { } // Quita la inicialización de la suscripción del constructor para hacerla en ngOnInit

  ngOnInit(): void {
    // Es mejor iniciar las suscripciones en ngOnInit
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Determina si la URL actual es una de las rutas de autenticación
      const isAuthRoute = event.urlAfterRedirects.includes('/auth/login') || event.urlAfterRedirects.includes('/auth/register');

      // showAppHeaderAndSidebar será true si NO estamos en una ruta de autenticación
      this.showAppHeaderAndSidebar = !isAuthRoute;

      // Si la ruta es de autenticación, asegura que el sidebar esté cerrado
      if (isAuthRoute) {
        this.isSidebarOpen = false;
      }
    });
  }

  ngOnDestroy(): void {
    // Es importante desuscribirse para evitar fugas de memoria
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  // Este método `logout` debería ser manejado por el sidebar, no directamente por `app.component.html`
  // si el botón de logout está en el sidebar.
  // Sin embargo, si lo tienes en el header principal también, lo mantenemos.
  logout() {
    this.authService.logout();
    this.isSidebarOpen = false; // Asegurarse de cerrar el sidebar al desloguearse
  }
}
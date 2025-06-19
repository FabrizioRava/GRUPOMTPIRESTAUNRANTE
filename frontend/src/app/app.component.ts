// src/app/app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core'; // Añadir OnInit y OnDestroy
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router'; // Importar Router y NavigationEnd
import { SidebarComponent } from './core/sidebar/sidebar.component';
import { AuthService } from './services/auth.service';
import { filter, Subscription } from 'rxjs'; // Importar filter y Subscription

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy { // Implementar OnInit y OnDestroy
  title = 'pedidos-ya';
  isSidebarOpen = false;
  showMenuButton: boolean = false; // Nueva variable para controlar la visibilidad del botón
  private routerSubscription: Subscription; // Para manejar la suscripción del router

  constructor(
    private authService: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute // Inyectar ActivatedRoute
  ) {
    // Inicializar la suscripción en el constructor
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd) // Filtra solo los eventos de fin de navegación
    ).subscribe((event: NavigationEnd) => {
      // Verifica si la ruta actual es '/restaurants'
      // Ajusta 'restaurants' si tu ruta es diferente (ej. '/restaurants-list')
      this.showMenuButton = event.urlAfterRedirects.includes('/restaurants');

      // Opcional: Cierra el sidebar si el usuario navega a otra página
      // this.isSidebarOpen = false;
    });
  }

  ngOnInit(): void {
    // La lógica de suscripción ya está en el constructor.
    // Esto se ejecutará una vez que el componente se inicialice.
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

  logout() {
    this.authService.logout();
  }
}

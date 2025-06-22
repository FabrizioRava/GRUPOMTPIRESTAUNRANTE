import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core'; // Importar ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { RestaurantService } from '../../../services/restaurant.service';
import { Restaurant } from '../../../models/restaurant.model';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './restaurant-list.component.html',
  styleUrls: ['./restaurant-list.component.css']
})
export class RestaurantListComponent implements OnInit, AfterViewInit {
  restaurants: Restaurant[] = [];
  isLoading: boolean = true;
  errorMessage: string | null = null;
  loggedInUserId: number | null = null;
  userCityId: number | null = null;

  isMyRestaurantsView: boolean = false;

  @ViewChild('restaurantCarouselInner') restaurantCarouselInner!: ElementRef;

  cardsPerView: number = 2;
  currentCarouselPage: number = 1;
  totalPages: number = 0;

  cardWidthWithMargin: number = 700; // Este valor sigue siendo clave

  constructor(
    private restaurantService: RestaurantService,
    private router: Router,
    private authService: AuthService,
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef // Inyectar ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loggedInUserId = this.authService.getLoggedInUserId();

    this.activatedRoute.data.subscribe(data => {
      this.isMyRestaurantsView = data['filterByOwner'] || false;

      if (this.isMyRestaurantsView) {
        this.userCityId = null;
      } else {
        this.userCityId = this.authService.getLoggedInUserCityId();
      }
      this.loadRestaurants();
    });
  }

  ngAfterViewInit(): void {
    // Este hook se llama después de que la vista y las vistas hijas se inicializan.
    // Damos un pequeño respiro para que el DOM se asiente antes de los cálculos iniciales.
    setTimeout(() => {
      this.calculateAndRenderCarousel();
    }, 100); // Pequeño retraso
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.calculateAndRenderCarousel(); // Recalcular en cada redimensionamiento
  }

  loadRestaurants(): void {
    this.isLoading = true;
    this.errorMessage = null;

    let filterCityId: number | undefined = undefined;
    let filterOwnerUserId: number | undefined = undefined;

    if (this.isMyRestaurantsView) {
      filterOwnerUserId = this.loggedInUserId !== null ? this.loggedInUserId : undefined;
    } else {
      filterCityId = this.userCityId !== null ? this.userCityId : undefined;
    }

    this.restaurantService.getAll(filterCityId, filterOwnerUserId).subscribe({
      next: (data: Restaurant[]) => {
        this.restaurants = data;
        this.isLoading = false;
        // Forzar la detección de cambios para que el DOM se actualice antes de calcular
        this.cdr.detectChanges();
        // Llamar al cálculo después de que los datos estén y el DOM se haya actualizado
        this.calculateAndRenderCarousel();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = 'Error al cargar los restaurantes. Por favor, intente de nuevo.';
        console.error('Error fetching restaurants:', err);
        this.isLoading = false;
        if (err.status === 401) {
          this.authService.logout();
        }
      }
    });
  }

  // Nueva función para encapsular el cálculo y la actualización
  calculateAndRenderCarousel(): void {
    if (this.restaurants.length === 0) {
      this.cardsPerView = 1;
      this.totalPages = 0;
      this.currentCarouselPage = 1;
      return;
    }

    // Calcula el número de tarjetas por vista
    if (window.innerWidth >= 1450) {
        this.cardsPerView = 2;
    } else if (window.innerWidth >= 1024) {
        this.cardsPerView = 1;
    } else if (window.innerWidth >= 768) {
        this.cardsPerView = 1;
    } else {
        this.cardsPerView = 1;
    }

    this.totalPages = (this.cardsPerView > 0) ? Math.ceil(this.restaurants.length / this.cardsPerView) : 0;

    // Ajusta la página actual si es necesario
    if (this.currentCarouselPage > this.totalPages && this.totalPages > 0) {
      this.currentCarouselPage = this.totalPages;
    } else if (this.totalPages === 0 && this.restaurants.length > 0) {
      this.currentCarouselPage = 1;
    } else if (this.restaurants.length === 0) {
      this.currentCarouselPage = 1;
      this.totalPages = 0;
    }
    
    // Log para depuración
    console.log('calculateAndRenderCarousel - Total Pages:', this.totalPages, 'Current Page:', this.currentCarouselPage, 'Restaurants:', this.restaurants.length, 'Cards Per View:', this.cardsPerView);


    // Asegurarse de que el DOM esté listo antes de intentar scrollear
    if (this.restaurantCarouselInner && this.restaurantCarouselInner.nativeElement) {
      this.updateCarouselPosition();
    } else {
      // Si restaurantCarouselInner aún no está disponible, intentar de nuevo un poco más tarde
      // Esto es una medida de seguridad, pero con ngAfterViewInit y cdr.detectChanges debería ser raro.
      setTimeout(() => {
        this.updateCarouselPosition();
      }, 50);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentCarouselPage = page;
      this.updateCarouselPosition();
    }
  }

  updateCarouselPosition(): void {
    if (this.restaurantCarouselInner && this.restaurantCarouselInner.nativeElement) {
      let scrollItemWidth: number = this.cardWidthWithMargin;

      // Intentar obtener el ancho real del elemento de la tarjeta si es posible
      const firstCardItem = this.restaurantCarouselInner.nativeElement.querySelector('.restaurant-card-item');
      if (firstCardItem) {
          // No necesitamos cambiar cardWidthWithMargin si 700px es el deseado
          // Pero si quieres que el JS detecte el ancho real, usarías:
          // scrollItemWidth = firstCardItem.offsetWidth;
      }

      const scrollAmount = (this.currentCarouselPage - 1) * this.cardsPerView * scrollItemWidth;

      this.restaurantCarouselInner.nativeElement.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });
      console.log('updateCarouselPosition - Scrolling to:', scrollAmount);
    } else {
        console.warn('restaurantCarouselInner.nativeElement is not available for updateCarouselPosition.');
    }
  }

  trackByRestaurantId(index: number, restaurant: Restaurant): number {
    return restaurant.id;
  }

  trackByPageNum(index: number, pageNum: number): number {
    return pageNum;
  }

  get pageNumbers(): number[] {
    if (this.totalPages <= 0) {
      return [];
    }
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }

  isOwner(restaurantUserId: number): boolean {
    return this.loggedInUserId === restaurantUserId;
  }

  enterRestaurant(id: number): void {
    this.router.navigate(['/restaurants', id]);
  }

  logout(): void {
    this.authService.logout();
  }
}
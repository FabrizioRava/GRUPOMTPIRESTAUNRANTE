import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core'; 
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

  cardWidthWithMargin: number = 700; 

  constructor(
    private restaurantService: RestaurantService,
    private router: Router,
    private authService: AuthService,
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef 
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
    setTimeout(() => {
      this.calculateAndRenderCarousel();
    }, 100); 
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.calculateAndRenderCarousel(); 
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
        this.cdr.detectChanges();
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

  calculateAndRenderCarousel(): void {
    if (this.restaurants.length === 0) {
      this.cardsPerView = 1;
      this.totalPages = 0;
      this.currentCarouselPage = 1;
      return;
    }

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

    if (this.currentCarouselPage > this.totalPages && this.totalPages > 0) {
      this.currentCarouselPage = this.totalPages;
    } else if (this.totalPages === 0 && this.restaurants.length > 0) {
      this.currentCarouselPage = 1;
    } else if (this.restaurants.length === 0) {
      this.currentCarouselPage = 1;
      this.totalPages = 0;
    }
    
    console.log('calculateAndRenderCarousel - Total Pages:', this.totalPages, 'Current Page:', this.currentCarouselPage, 'Restaurants:', this.restaurants.length, 'Cards Per View:', this.cardsPerView);


    if (this.restaurantCarouselInner && this.restaurantCarouselInner.nativeElement) {
      this.updateCarouselPosition();
    } else {
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
      const firstCardItem = this.restaurantCarouselInner.nativeElement.querySelector('.restaurant-card-item');
      if (firstCardItem) {
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
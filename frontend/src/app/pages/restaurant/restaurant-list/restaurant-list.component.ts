import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router'; // Importar ActivatedRoute
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
export class RestaurantListComponent implements OnInit {
  restaurants: Restaurant[] = [];
  isLoading: boolean = true;
  errorMessage: string | null = null;
  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 0;
  loggedInUserId: number | null = null;
  userCityId: number | null = null; // Variable para almacenar el cityId del usuario
  
  isMyRestaurantsView: boolean = false; 

  constructor(
    private restaurantService: RestaurantService,
    private router: Router,
    private authService: AuthService,
    private activatedRoute: ActivatedRoute // Inyectar ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loggedInUserId = this.authService.getLoggedInUserId();
    
    this.activatedRoute.data.subscribe(data => {
      this.isMyRestaurantsView = data['filterByOwner'] || false;
      console.log(`RLC: isMyRestaurantsView: ${this.isMyRestaurantsView}`);

      if (this.isMyRestaurantsView) {
        this.userCityId = null; 
      } else {
        this.userCityId = this.authService.getLoggedInUserCityId();
        console.log(`RLC: ID de ciudad del usuario logueado para vista pública: ${this.userCityId}`);
      }
      this.loadRestaurants(); 
    });
  }

  loadRestaurants(): void {
    this.isLoading = true;
    this.errorMessage = null;

    let filterCityId: number | undefined = undefined;
    let filterOwnerUserId: number | undefined = undefined;

    if (this.isMyRestaurantsView) {
      filterOwnerUserId = this.loggedInUserId !== null ? this.loggedInUserId : undefined; 
      console.log(`RLC: Cargando mis restaurantes para userId: ${filterOwnerUserId}`);
    } else {
      filterCityId = this.userCityId !== null ? this.userCityId : undefined;
      console.log(`RLC: Cargando restaurantes para cityId: ${filterCityId}`);
    }
    
    // Llamar al servicio con los parámetros de filtro adecuados
    // ESTA LLAMADA AHORA COINCIDE CON LA FIRMA CORREGIDA EN restaurant.service.ts
    this.restaurantService.getAll(filterCityId, filterOwnerUserId).subscribe({ 
      next: (data: Restaurant[]) => {
        this.restaurants = data;
        this.totalPages = Math.ceil(this.restaurants.length / this.itemsPerPage);
        this.isLoading = false;
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

  get pagedRestaurants(): Restaurant[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.restaurants.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  enterRestaurant(id: number): void {
    console.log('Ingresando al restaurante con ID:', id);
    this.router.navigate(['/restaurants', id]); 
  }

  isOwner(restaurantUserId: number): boolean {
    return this.loggedInUserId === restaurantUserId;
  }

  logout(): void {
    this.authService.logout();
  }

  trackByRestaurantId(index: number, restaurant: Restaurant): number {
    return restaurant.id;
  }

  trackByPageNum(index: number, pageNum: any): number {
    return pageNum;
  }
}








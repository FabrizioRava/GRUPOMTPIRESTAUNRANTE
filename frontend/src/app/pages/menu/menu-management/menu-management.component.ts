import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; 
import { MenuService, MenuItem } from '../../../services/menu.service';
import { HttpErrorResponse } from '@angular/common/http';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    RouterLink 
  ],
  templateUrl: './menu-management.component.html',
  styleUrls: ['./menu-management.component.css']
})
export class MenuManagementComponent implements OnInit {
  menuForm: FormGroup;
  restaurantId: number | null = null;
  menuItems: MenuItem[] = [];
  errorMessage: string | null = null;
  isLoading: boolean = false;
  isSubmitting: boolean = false; 

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute, 
    private router: Router,
    private menuService: MenuService,
    private authService: AuthService
  ) {
    this.menuForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0.01)]], 
      imageUrl: ['', [Validators.required, Validators.pattern('https?://.+')]], 
      category: [''] 
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = +params['restaurantId']; 
      if (isNaN(id)) {
        this.errorMessage = 'ID de restaurante inválido. Redirigiendo...';
        this.router.navigate(['/restaurants']); 
        return;
      }
      this.restaurantId = id;
      this.loadMenuItems(this.restaurantId); 
    });
  }

  loadMenuItems(restaurantId: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.menuService.getMenuByRestaurantId(restaurantId).subscribe({
      next: (items: MenuItem[]) => {
        this.menuItems = items;
        this.isLoading = false;
        console.log('MenuManagementComponent: Menús cargados para gestión:', this.menuItems);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = 'Error al cargar los ítems del menú. Por favor, intenta de nuevo.';
        this.isLoading = false;
        console.error('Error cargando menús para gestión:', err);
        if (err.status === 401 || err.status === 403) {
          this.errorMessage = 'No autorizado para ver este menú o sesión expirada.';
          this.authService.logout(); 
        }
      }
    });
  }

  onSubmit(): void {
    if (!this.restaurantId) {
      this.errorMessage = 'No se ha podido determinar el ID del restaurante para añadir el menú.';
      return;
    }

    if (this.menuForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = null;

      const newMenuItem: MenuItem = {
        ...this.menuForm.value,
        restaurantId: this.restaurantId 
      };

      if (newMenuItem.category === '') {
        newMenuItem.category = null;
      }

      this.menuService.createMenuItem(newMenuItem).subscribe({
        next: (item) => {
          console.log('MenuManagementComponent: Ítem de menú creado con éxito:', item);
          this.menuItems.push(item); 
          this.menuForm.reset(); 
          this.menuForm.get('price')?.setValue(''); 
          this.isSubmitting = false;
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = 'Error al crear el ítem del menú.';
          this.isSubmitting = false;
          console.error('Error creando ítem de menú:', err);
          if (err.status === 400 && err.error?.message) {
            this.errorMessage += `: ${err.error.message}`;
          } else if (err.status === 401 || err.status === 403) {
             this.errorMessage = 'No autorizado para crear ítems de menú o sesión expirada.';
             this.authService.logout();
          }
        }
      });
    } else {
      this.errorMessage = 'Por favor, completa todos los campos requeridos correctamente.';
      this.menuForm.markAllAsTouched();
    }
  }

  get name() { return this.menuForm.get('name'); }
  get description() { return this.menuForm.get('description'); }
  get price() { return this.menuForm.get('price'); }
  get imageUrl() { return this.menuForm.get('imageUrl'); }
  get category() { return this.menuForm.get('category'); }

  editMenuItem(item: MenuItem): void {
    console.log('Editar ítem:', item);
  }

  deleteMenuItem(itemId: number | undefined): void {
    if (typeof itemId === 'undefined') {
      console.warn('ID de ítem de menú no definido para eliminar.');
      this.errorMessage = 'Error: ID de ítem no válido para eliminar.';
      return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar este ítem del menú? Esta acción no se puede deshacer.')) {
      this.menuService.deleteMenuItem(itemId).subscribe({
        next: () => {
          console.log('MenuManagementComponent: Ítem de menú eliminado:', itemId);
          this.menuItems = this.menuItems.filter(item => item.id !== itemId); 
          this.errorMessage = 'Ítem de menú eliminado con éxito.'; 
          setTimeout(() => this.errorMessage = null, 3000); 
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = 'Error al eliminar el ítem del menú. Por favor, intenta de nuevo.';
          console.error('Error eliminando ítem de menú:', err);
          if (err.status === 401 || err.status === 403) {
            this.errorMessage = 'No autorizado para eliminar ítems de menú o sesión expirada.';
            this.authService.logout();
          }
        }
      });
    }
  }
}
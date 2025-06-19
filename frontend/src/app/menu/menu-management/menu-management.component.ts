// src/app/menu/menu-management/menu-management.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; // Importar RouterLink
import { MenuService, MenuItem } from '../../services/menu.service';
import { HttpErrorResponse } from '@angular/common/http';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    RouterLink // ¡Importante para [routerLink] en el HTML!
  ],
  templateUrl: './menu-management.component.html',
  styleUrls: ['./menu-management.component.css']
})
export class MenuManagementComponent implements OnInit {
  menuForm: FormGroup;
  restaurantId: number | null = null;
  menuItems: MenuItem[] = []; // Para mostrar los menús existentes
  errorMessage: string | null = null;
  isLoading: boolean = false;
  isSubmitting: boolean = false; // Para controlar el estado del formulario al enviar

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute, // Para obtener el ID del restaurante de la URL
    private router: Router,
    private menuService: MenuService,
    private authService: AuthService
  ) {
    // Inicializar el formulario con validadores
    this.menuForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0.01)]], // Precio debe ser > 0
      imageUrl: ['', [Validators.required, Validators.pattern('https?://.+')]], // Validar formato URL
      category: [''] // Opcional, puede ser cadena vacía
    });
  }

  ngOnInit(): void {
    // Obtener el restaurantId de los parámetros de la URL
    // Ya no es .parent?.params porque la ruta es de nivel superior: /restaurants/:restaurantId/menus
    this.route.params.subscribe(params => {
      const id = +params['restaurantId']; // El nombre del parámetro es 'restaurantId'
      if (isNaN(id)) {
        this.errorMessage = 'ID de restaurante inválido. Redirigiendo...';
        this.router.navigate(['/restaurants']); // Redirigir si el ID es inválido
        return;
      }
      this.restaurantId = id;
      this.loadMenuItems(this.restaurantId); // Cargar menús existentes para este restaurante
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
          // Opcional: redirigir al login si es un error de autenticación/autorización
          this.authService.logout(); // O solo router.navigate(['/login']);
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
        restaurantId: this.restaurantId // Asignar el ID del restaurante obtenido de la URL
      };

      // Limpia la categoría si es una cadena vacía antes de enviar (el backend espera null)
      if (newMenuItem.category === '') {
        newMenuItem.category = null;
      }

      this.menuService.createMenuItem(newMenuItem).subscribe({
        next: (item) => {
          console.log('MenuManagementComponent: Ítem de menú creado con éxito:', item);
          this.menuItems.push(item); // Añadir el nuevo ítem a la lista local
          this.menuForm.reset(); // Limpiar el formulario
          this.menuForm.get('price')?.setValue(''); // Asegurarse de que el campo de precio se limpie correctamente
          this.isSubmitting = false;
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = 'Error al crear el ítem del menú.';
          this.isSubmitting = false;
          console.error('Error creando ítem de menú:', err);
          if (err.status === 400 && err.error?.message) {
            // Si el backend envía un mensaje de error de validación específico
            this.errorMessage += `: ${err.error.message}`;
          } else if (err.status === 401 || err.status === 403) {
             this.errorMessage = 'No autorizado para crear ítems de menú o sesión expirada.';
             this.authService.logout();
          }
        }
      });
    } else {
      this.errorMessage = 'Por favor, completa todos los campos requeridos correctamente.';
      // Opcional: Marcar todos los campos como "touched" para mostrar errores de validación inmediatamente
      this.menuForm.markAllAsTouched();
    }
  }

  // --- Getters para facilitar la validación en el HTML ---
  get name() { return this.menuForm.get('name'); }
  get description() { return this.menuForm.get('description'); }
  get price() { return this.menuForm.get('price'); }
  get imageUrl() { return this.menuForm.get('imageUrl'); }
  get category() { return this.menuForm.get('category'); }

  // Métodos placeholder para editar y eliminar
  editMenuItem(item: MenuItem): void {
    console.log('Editar ítem:', item);
    // TODO: Implementar lógica para cargar el ítem en el formulario para edición
    // o abrir un modal/nueva vista para editar.
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
          this.menuItems = this.menuItems.filter(item => item.id !== itemId); // Eliminar de la lista local
          this.errorMessage = 'Ítem de menú eliminado con éxito.'; // Mensaje de éxito temporal
          setTimeout(() => this.errorMessage = null, 3000); // Borrar mensaje después de 3 segundos
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
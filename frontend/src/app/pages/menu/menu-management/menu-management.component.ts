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
    RouterLink,
  ],
  templateUrl: './menu-management.component.html',
  styleUrls: ['./menu-management.component.css'],
})
export class MenuManagementComponent implements OnInit {
  menuForm: FormGroup;
  restaurantId: number | null = null;
  menuItems: MenuItem[] = [];
  errorMessage: string | null = null;
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  isEditMode: boolean = false;
  currentMenuItem: MenuItem | null = null;
  showDeleteConfirmation: boolean = false;
  itemToDeleteId: number | null = null;

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
      category: [''],
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
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
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = 'Error al cargar los ítems del menú. Por favor, intenta de nuevo.';
        this.isLoading = false;
        if (err.status === 401 || err.status === 403) {
          this.errorMessage = 'No autorizado para ver este menú o sesión expirada.';
          this.authService.logout();
        }
      },
    });
  }

  onSubmit(): void {
    if (!this.restaurantId) {
      this.errorMessage = 'No se ha podido determinar el ID del restaurante para añadir/editar el menú.';
      return;
    }

    if (this.menuForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = null;

      const menuItemData: MenuItem = {
        ...this.menuForm.value,
        restaurantId: this.restaurantId,
      };

      if (menuItemData.category === '') {
        menuItemData.category = null;
      }

      const operation = this.isEditMode
        ? this.menuService.updateMenuItem(this.currentMenuItem!.id!, menuItemData)
        : this.menuService.createMenuItem(menuItemData);

      operation.subscribe({
        next: (item) => {
          if (this.isEditMode) {
            const index = this.menuItems.findIndex(
              (m) => m.id === this.currentMenuItem!.id
            );
            if (index !== -1) {
              this.menuItems[index] = item;
            }
          } else {
            this.menuItems.push(item);
          }
          this.resetForm();
          this.isSubmitting = false;
          this.errorMessage = 'Ítem guardado con éxito.';
          setTimeout(() => (this.errorMessage = null), 3000);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = `Error al ${
            this.isEditMode ? 'actualizar' : 'crear'
          } el ítem del menú.`;
          this.isSubmitting = false;
          if (err.status === 400 && err.error?.message) {
            this.errorMessage += `: ${err.error.message}`;
          } else if (err.status === 401 || err.status === 403) {
            this.errorMessage =
              'No autorizado para crear/actualizar ítems de menú o sesión expirada.';
            this.authService.logout();
          }
        },
      });
    } else {
      this.errorMessage =
        'Por favor, completa todos los campos requeridos correctamente.';
      this.menuForm.markAllAsTouched();
    }
  }

  editMenuItem(item: MenuItem): void {
    this.isEditMode = true;
    this.currentMenuItem = item;
    this.menuForm.patchValue({
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      category: item.category || '',
    });
    this.errorMessage = null;
  }

  cancelEdit(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.menuForm.reset();
    this.isEditMode = false;
    this.currentMenuItem = null;
    Object.keys(this.menuForm.controls).forEach(key => {
      this.menuForm.get(key)?.setErrors(null);
      this.menuForm.get(key)?.markAsUntouched();
      this.menuForm.get(key)?.markAsPristine();
    });
  }

  confirmDelete(itemId: number): void {
    this.itemToDeleteId = itemId;
    this.showDeleteConfirmation = true;
    this.errorMessage = null; // Clear any previous error message
  }

  deleteConfirmed(): void {
    if (this.itemToDeleteId === null) {
      this.errorMessage = 'Error: No se ha seleccionado ningún ítem para eliminar.';
      this.showDeleteConfirmation = false;
      return;
    }

    this.menuService.deleteMenuItem(this.itemToDeleteId).subscribe({
      next: () => {
        this.menuItems = this.menuItems.filter((item) => item.id !== this.itemToDeleteId);
        this.errorMessage = 'Ítem de menú eliminado con éxito.';
        this.showDeleteConfirmation = false;
        this.itemToDeleteId = null;
        setTimeout(() => (this.errorMessage = null), 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = 'Error al eliminar el ítem del menú. Por favor, intenta de nuevo.';
        this.showDeleteConfirmation = false;
        this.itemToDeleteId = null;
        if (err.status === 401 || err.status === 403) {
          this.errorMessage = 'No autorizado para eliminar ítems de menú o sesión expirada.';
          this.authService.logout();
        }
      },
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirmation = false;
    this.itemToDeleteId = null;
    this.errorMessage = null;
  }

  get name() {
    return this.menuForm.get('name');
  }
  get description() {
    return this.menuForm.get('description');
  }
  get price() {
    return this.menuForm.get('price');
  }
  get imageUrl() {
    return this.menuForm.get('imageUrl');
  }
  get category() {
    return this.menuForm.get('category');
  }
}
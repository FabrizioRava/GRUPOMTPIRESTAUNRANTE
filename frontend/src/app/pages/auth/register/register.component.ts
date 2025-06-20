// src/app/auth/register/register.component.ts
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common'; // Asegurarse de importar CommonModule
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component'; // Ruta corregida
import { AuthService } from '../../../services/auth.service'; // Importa TU AuthService
import { finalize } from 'rxjs/operators'; // Necesario para el pipe

@Component({
  selector: 'app-register',
  standalone: true,
  // Asegúrate que todos los módulos necesarios estén importados
  imports: [FormsModule, RouterLink, CommonModule, LoadingSpinnerComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  // Datos del formulario con valores iniciales
  formData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  // Estados del componente para UI/UX
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null; // Mensaje de éxito
  passwordsMatch = true;
  formSubmitted = false; // Bandera para indicar si el formulario ha sido intentado enviar

  // Inyección de dependencias
  constructor(
    private authService: AuthService, // Inyecta el AuthService
    private router: Router
  ) {}

  /**
   * Verifica si las contraseñas coinciden en tiempo real o al enviar el formulario.
   */
  checkPasswords(): void {
    this.passwordsMatch = this.formData.password === this.formData.confirmPassword;
    if (!this.passwordsMatch) {
      this.errorMessage = 'Las contraseñas no coinciden.';
    } else if (this.errorMessage === 'Las contraseñas no coinciden.') {
      // Limpia el mensaje de error si las contraseñas ahora coinciden
      this.errorMessage = null;
    }
  }

  /**
   * Maneja el envío del formulario de registro.
   * @param registerForm Referencia al formulario NgForm para validación.
   */
  onSubmit(registerForm: NgForm): void {
    this.formSubmitted = true; // Marcar que se intentó enviar el formulario
    this.errorMessage = null; // Limpiar mensajes de error previos
    this.successMessage = null; // Limpiar mensajes de éxito previos

    // Validar el formulario de Angular y las contraseñas antes de continuar
    if (!registerForm.valid) {
      this.markFormControlsAsTouched(registerForm); // Marca los controles como 'touched' para mostrar errores
      this.errorMessage = 'Por favor, complete todos los campos requeridos y corrija los errores.';
      return;
    }

    this.checkPasswords(); // Vuelve a verificar las contraseñas
    if (!this.passwordsMatch) {
      return; // Si no coinciden, no continuar
    }

    this.isLoading = true; // Activa el spinner de carga

    // Extraer confirmPassword para no enviarlo al backend
    const { confirmPassword, ...userData } = this.formData;

    // Llama al método register del AuthService
    this.authService.register(userData)
      .pipe(
        finalize(() => {
          this.isLoading = false; // Desactiva el spinner siempre al finalizar
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = '¡Registro exitoso! Serás redirigido para iniciar sesión.';
          // Redirigir a login después de un breve momento para que el usuario vea el mensaje de éxito
          setTimeout(() => {
            this.router.navigate(['/login'], {
              state: { registrationSuccess: true } // Pasar estado para mostrar mensaje en Login
            });
          }, 2000); // Redirige después de 2 segundos
        },
        error: (err) => {
          this.handleRegistrationError(err);
        }
      });
  }


  /**
   * Maneja y formatea los errores de registro para mostrarlos al usuario.
   * @param error Objeto de error recibido del servicio de autenticación.
   */
  private handleRegistrationError(error: any): void {
    if (typeof error === 'string') {
      this.errorMessage = error;
    } else if (error?.message) {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = 'Ocurrió un error inesperado durante el registro. Por favor, intente nuevamente.';
    }
  }

  /**
   * Marca todos los controles del formulario como 'touched' para disparar la validación visual.
   * Esto es útil cuando el usuario intenta enviar un formulario inválido.
   * @param form Referencia al formulario NgForm.
   */
  private markFormControlsAsTouched(form: NgForm): void {
    Object.values(form.controls).forEach(control => {
      control.markAsTouched();
    });
  }
}


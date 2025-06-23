import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component'; 
import { AuthService } from '../../../services/auth.service'; 
import { finalize } from 'rxjs/operators'; 

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule, LoadingSpinnerComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  formData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null; 
  passwordsMatch = true;
  formSubmitted = false; 

  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}


  checkPasswords(): void {
    this.passwordsMatch = this.formData.password === this.formData.confirmPassword;
    if (!this.passwordsMatch) {
      this.errorMessage = 'Las contraseñas no coinciden.';
    } else if (this.errorMessage === 'Las contraseñas no coinciden.') {
      this.errorMessage = null;
    }
  }


  onSubmit(registerForm: NgForm): void {
    this.formSubmitted = true; 
    this.errorMessage = null; 
    this.successMessage = null; 

    if (!registerForm.valid) {
      this.markFormControlsAsTouched(registerForm); 
      this.errorMessage = 'Por favor, complete todos los campos requeridos y corrija los errores.';
      return;
    }

    this.checkPasswords(); 
    if (!this.passwordsMatch) {
      return; 
    }

    this.isLoading = true; 

    const { confirmPassword, ...userData } = this.formData;

    this.authService.register(userData)
      .pipe(
        finalize(() => {
          this.isLoading = false; 
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = '¡Registro exitoso! Serás redirigido para iniciar sesión.';
          setTimeout(() => {
            this.router.navigate(['/login'], {
              state: { registrationSuccess: true } 
            });
          }, 2000); 
        },
        error: (err) => {
          this.handleRegistrationError(err);
        }
      });
  }


  private handleRegistrationError(error: any): void {
    if (typeof error === 'string') {
      this.errorMessage = error;
    } else if (error?.message) {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = 'Ocurrió un error inesperado durante el registro. Por favor, intente nuevamente.';
    }
  }


  private markFormControlsAsTouched(form: NgForm): void {
    Object.values(form.controls).forEach(control => {
      control.markAsTouched();
    });
  }
}


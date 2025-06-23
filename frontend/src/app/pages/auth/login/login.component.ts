import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';
import { AuthService } from '../../../services/auth.service'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    CommonModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  userMessage = '';
  isError = false;
  isLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  login() {
    this.userMessage = '';
    this.isError = false;
    this.isLoading = true;

    if (!this.email || !this.password) {
      this.userMessage = 'Por favor, completá email y contraseña.';
      this.isError = true;
      this.isLoading = false;
      return;
    }

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.userMessage = '¡Inicio de sesión exitoso! Redirigiendo...';
        this.isError = false;
        this.router.navigate(['/restaurants']); 
      },
      error: (err) => {
        this.isLoading = false;
        this.userMessage = err.error?.message || 'Error al iniciar sesión. Por favor, intente de nuevo.';
        this.isError = true;
        console.error('Login error:', err);
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  forgotPassword() {
    this.userMessage = 'Te redirigiremos a la página de recuperación de contraseña.';
    this.isError = false;
    console.log('Ir a recuperación de contraseña');
  }
}
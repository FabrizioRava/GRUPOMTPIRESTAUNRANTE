// src/auth/auth.controller.ts
import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common'; // Añadir HttpCode, HttpStatus
import { AuthService } from './auth.service';

// Interfaz (o puedes crear un DTO separado) para lo que esperas en el body
interface LoginBody {
  email: string; // ¡CAMBIO CLAVE: Ahora esperamos 'email'!
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK) // Para asegurar que siempre devuelve 200 OK si el login es exitoso
  async login(
    @Body() body: LoginBody, // ¡CAMBIO CLAVE: Usar la interfaz y esperar 'email'!
  ) {
    // CAMBIO CLAVE: Pasar body.email en lugar de body.username
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }
}
import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from '../users/dto/register-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.authService.login(user);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerUserDto: RegisterUserDto) {
    try {
      const newUser = await this.authService.register(registerUserDto);
      return { message: 'Usuario registrado exitosamente', user: newUser };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
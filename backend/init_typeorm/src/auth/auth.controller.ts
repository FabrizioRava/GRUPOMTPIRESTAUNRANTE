import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common'; 
import { AuthService } from './auth.service';

interface LoginBody {
  email: string; 
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK) 
  async login(
    @Body() body: LoginBody,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }
}
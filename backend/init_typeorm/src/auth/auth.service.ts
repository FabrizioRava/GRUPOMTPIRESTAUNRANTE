// backend/src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Define la interfaz para el usuario interno
interface InternalUser {
  userId: number; // <-- Vuelve a ser NUMBER
  email: string;
  password?: string;
  cityId: number;
}

@Injectable()
export class AuthService {
  // Array de usuarios de ejemplo
  private readonly users: InternalUser[] = [
    {
      userId: 1, // <-- Vuelve a ser un número como ID
      email: 'test@example.com',
      password: 'password123',
      cityId: 140357,
    },
  ];

  constructor(private readonly jwtService: JwtService) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = this.users.find(
      (user) => user.email === email && user.password === pass,
    );
    if (user) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) { // 'user' aquí es el objeto que devuelve validateUser (con userId como number, email, y cityId)
    const payload = {
      email: user.email,
      sub: user.userId, // 'sub' (subject) ahora es un número
      cityId: user.cityId
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

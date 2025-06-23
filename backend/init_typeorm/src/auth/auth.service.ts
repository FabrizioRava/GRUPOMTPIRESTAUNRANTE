import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface InternalUser {
  userId: number; // 
  email: string;
  password?: string;
  cityId: number;
}

@Injectable()
export class AuthService {
  private readonly users: InternalUser[] = [
    {
      userId: 1, 
      email: 'test@example.com',
      password: 'password123',
      cityId: 140357,
    },

    {
      userId: 2, 
      email: 'test2@example.com',
      password: 'password123',
      cityId: 100213,
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

  async login(user: any) { 
    const payload = {
      email: user.email,
      sub: user.userId, 
      cityId: user.cityId
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/users.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      cityId: user.cityId
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    const existingUser = await this.userService.findByEmail(registerUserDto.email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado.');
    }

    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);
    const newUser = await this.userService.create({
      name: registerUserDto.name,
      email: registerUserDto.email,
      password: hashedPassword,
      cityId: registerUserDto.cityId,
    });

    const { password, ...result } = newUser;
    return result;
  }
}
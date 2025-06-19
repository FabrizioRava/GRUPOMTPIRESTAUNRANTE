// backend/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Es buena práctica no ignorar la expiración
      secretOrKey: 'esteEsMiTokenSecreto123',
    });
  }

  // El payload.sub ahora será un número
  async validate(payload: any) {
    // Retornamos el payload para que esté disponible en req.user
    // Asegúrate de que 'userId' aquí sea del mismo tipo que 'payload.sub'
    return { userId: payload.sub as number, email: payload.email, cityId: payload.cityId }; // <-- userId como number
  }
}

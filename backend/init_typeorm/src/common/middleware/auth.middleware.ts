import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No autorizado');
    }

    const token = authHeader.split(' ')[1];

    // Aquí deberías validar el token, por ahora solo lo imprimimos
    console.log('Token recibido:', token);

    // Si el token es válido, sigue a la siguiente función
    next();
  }
}

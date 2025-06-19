    // src/auth/auth.module.ts
    import { Module } from '@nestjs/common';
    import { JwtModule } from '@nestjs/jwt';
    import { PassportModule } from '@nestjs/passport';

    import { AuthService } from './auth.service';
    import { JwtStrategy } from './jwt.strategy';
    import { AuthController } from './auth.controller';

    @Module({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'esteEsMiTokenSecreto123', // ¡Asegúrate que sea EXACTAMENTE este string!
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [AuthService, JwtStrategy],
      controllers: [AuthController],
      exports: [AuthService],
    })
    export class AuthModule {}
// src/app.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Importación del GeorefModule
import { GeorefModule } from './georef/georef.module'; 

// [AÑADIDO] Importar tus módulos de entidades y servicios de base de datos
// Asegúrate de que estas rutas son correctas para tu proyecto
import { RestaurantModule } from './restaurant/restaurant.module'; 
import { MenuModule } from './menu/menu.module'; 
// Si tienes otros módulos que interactúan con la base de datos, impórtalos aquí también
import { AuthModule } from './auth/auth.module'; // Importar AuthModule si maneja usuarios de DB

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT') as string, 10) || 5432,
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Usar solo para desarrollo, NO en producción
        logging: true,
      }),
    }),
    // Incluye el GeorefModule
    GeorefModule, 
    // [AÑADIDO] Importa los módulos que usan TypeORM para tus entidades
    RestaurantModule, 
    MenuModule,
    AuthModule, // Si el AuthModule también tiene entidades o repositorios de DB
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    console.log('--- DB Configuration Check ---');
    console.log('DB_HOST:', this.configService.get<string>('DB_HOST'));
    console.log('DB_PORT:', this.configService.get<string>('DB_PORT'));
    console.log('DB_USERNAME:', this.configService.get<string>('DB_USERNAME'));
    console.log('DB_PASSWORD:', this.configService.get<string>('DB_PASSWORD') ? '********' : 'NOT SET');
    console.log('DB_DATABASE:', this.configService.get<string>('DB_DATABASE'));
    console.log('NODE_ENV:', this.configService.get<string>('NODE_ENV'));
    console.log('--- End DB Configuration Check ---');
  }
}
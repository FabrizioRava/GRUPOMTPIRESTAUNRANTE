import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { GeorefModule } from './georef/georef.module';
import { RestaurantModule } from './restaurants/restaurants.module';
import { MenuModule } from './menus/menus.module';
import { AuthModule } from './auth/auth.module';
import { UserEntity } from './entities/user/user.entity';

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
        database: configService.get<string>('DB_NAME'),
        entities: [UserEntity, __dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: true,
      }),
    }),
    GeorefModule,
    RestaurantModule,
    MenuModule,
    AuthModule,
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
    console.log('DB_NAME:', this.configService.get<string>('DB_NAME'));
    console.log('NODE_ENV:', this.configService.get<string>('NODE_ENV'));
    console.log('--- End DB Configuration Check ---');
  }
}
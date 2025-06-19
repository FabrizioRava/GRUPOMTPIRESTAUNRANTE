// src/menu/menu.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from '../entities/menu/menu.entity';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Menu])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [
    TypeOrmModule.forFeature([Menu]), // Exporta el repositorio
    MenuService // Opcional: si otros módulos necesitan el servicio
  ]
})
export class MenuModule {}
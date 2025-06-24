import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from '../entities/menu/menu.entity';
import { MenuService } from './menus.service';
import { MenuController } from './menus.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Menu])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [
    TypeOrmModule.forFeature([Menu]), 
    MenuService 
  ]
})
export class MenuModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from '../entities/restaurant/restaurant.entity';
import { RestaurantService } from './restaurants.service';
import { RestaurantController } from './restaurants.controller';
import { MenuModule } from '../menus/menus.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Restaurant]), 
    MenuModule,
  ],
  controllers: [RestaurantController],
  providers: [RestaurantService],
  exports: [TypeOrmModule.forFeature([Restaurant])] 
})
export class RestaurantModule {}
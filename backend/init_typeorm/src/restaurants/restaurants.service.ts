import { Injectable, NotFoundException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant/restaurant.entity';
import { Menu } from '../entities/menu/menu.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateMenuDto } from '../menus/dto/create-menu.dto';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
  ) {}

  async createRestaurant(createRestaurantDto: CreateRestaurantDto, userId: number): Promise<Restaurant> {
    if (createRestaurantDto.address?.cityId) {
      createRestaurantDto.address.cityId = Number(createRestaurantDto.address.cityId);
    }

    const restaurant = this.restaurantRepository.create(createRestaurantDto);
    restaurant.userId = userId; 
    
    return this.restaurantRepository.save(restaurant);
  }

  async createMenuForRestaurant(restaurantId: number, createMenuDto: CreateMenuDto): Promise<Menu> {
    const restaurant = await this.restaurantRepository.findOne({ where: { id: restaurantId } });
    if (!restaurant) {
      throw new NotFoundException(`Restaurante con ID ${restaurantId} no encontrado`);
    }

    const menu = this.menuRepository.create({
      ...createMenuDto,
      restaurantId: restaurant.id,
    });

    return this.menuRepository.save(menu);
  }

 
  async findAll(cityId?: number, ownerUserId?: number): Promise<Restaurant[]> {
    const queryBuilder = this.restaurantRepository.createQueryBuilder('restaurant');

    if (cityId !== undefined && cityId !== null) {
      queryBuilder.andWhere("CAST(restaurant.address->>'cityId' AS INTEGER) = :cityId", { cityId });
    }

    if (ownerUserId !== undefined && ownerUserId !== null) {
      queryBuilder.andWhere('restaurant.userId = :ownerUserId', { ownerUserId });
    }

    queryBuilder.leftJoinAndSelect('restaurant.menus', 'menu');
    return await queryBuilder.getMany();
  }


  async findOne(id: number): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id },
      relations: ['menus'],
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurante con ID ${id} no encontrado`);
    }

    return restaurant;
  }


  async findRestaurantMenus(restaurantId: number): Promise<Menu[]> {
    const restaurantExists = await this.restaurantRepository.exists({ where: { id: restaurantId } });
    if (!restaurantExists) {
      throw new NotFoundException(`Restaurante con ID ${restaurantId} no encontrado`);
    }

    return this.menuRepository.find({
      where: { restaurantId },
      order: { id: 'ASC' },
    });
  }


  async update(id: number, updateDto: UpdateRestaurantDto, userId: number): Promise<Restaurant> {
    if (updateDto.address?.cityId) {
      updateDto.address.cityId = Number(updateDto.address.cityId);
    }

    const restaurant = await this.restaurantRepository.findOne({
      where: { id },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurante con ID ${id} no encontrado`);
    }

    if (restaurant.userId !== userId) {
      throw new ForbiddenException(`No tiene permiso para actualizar este restaurante`);
    }

    Object.assign(restaurant, updateDto);

    if (updateDto.address) {
      restaurant.address = {
        ...restaurant.address,
        ...updateDto.address,  
        location: { 
          ...(restaurant.address?.location || {}),
          ...(updateDto.address.location || {})    
        }
      };
    }

    await this.restaurantRepository.save(restaurant);
    return this.findOne(id);
  }

  async remove(id: number, userId: number): Promise<void> {
    const restaurant = await this.restaurantRepository.findOne({ where: { id } });

    if (!restaurant) {
      throw new NotFoundException(`Restaurante con ID ${id} no encontrado`);
    }

    if (restaurant.userId !== userId) {
      throw new ForbiddenException(`No tiene permiso para eliminar este restaurante`);
    }

    await this.restaurantRepository.delete(id);
    throw new HttpException('', HttpStatus.NO_CONTENT);
  }
}
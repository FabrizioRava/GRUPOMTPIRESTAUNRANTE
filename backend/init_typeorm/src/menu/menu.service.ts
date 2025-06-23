import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from '../entities/menu/menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto'; 

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
  ) {}

  async create(createMenuDto: CreateMenuDto): Promise<Menu> {
    const newMenu = this.menuRepository.create(createMenuDto);
    return this.menuRepository.save(newMenu);
  }

  async findAll(): Promise<Menu[]> {
    return this.menuRepository.find();
  }

  async findOne(id: number): Promise<Menu> {
    const menu = await this.menuRepository.findOne({
      where: { id },
      relations: ['restaurant']
    });
    if (!menu) {
      throw new NotFoundException(`Menu item with ID ${id} not found.`);
    }
    return menu;
  }

  async update(id: number, updateMenuDto: UpdateMenuDto): Promise<Menu> {
    const menuToUpdate = await this.menuRepository.findOne({ where: { id } });

    if (!menuToUpdate) {
      throw new NotFoundException(`Menu item with ID ${id} not found.`);
    }

    Object.assign(menuToUpdate, updateMenuDto);
    const updatedMenu = await this.menuRepository.save(menuToUpdate);
    return this.findOne(updatedMenu.id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.menuRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Menu item with ID ${id} not found.`);
    }
    return { message: 'deleted' };
  }

  async findByRestaurantId(restaurantId: number): Promise<Menu[]> {
    return this.menuRepository.find({
      where: { restaurantId },
    });
  }
}
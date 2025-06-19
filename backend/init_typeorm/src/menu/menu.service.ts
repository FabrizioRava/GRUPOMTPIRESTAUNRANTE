// src/menu/menu.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from '../entities/menu/menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto'; // Asegúrate de importar el DTO de actualización

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
  ) {}

  async create(createMenuDto: CreateMenuDto): Promise<Menu> {
    const newMenu = this.menuRepository.create(createMenuDto);
    // Asegúrate de que los campos que no son 'category' se manejen
    // como strings vacíos si no se especifican en el DTO o en el frontend.
    // Si quieres que se guarden como NULL cuando no hay valor, el frontend
    // debe enviar explícitamente `null` o no enviar la propiedad si el DTO no es requerido.
    // Con @IsNotEmpty() en CreateMenuDto para description, price, imageUrl,
    // el DTO validation fallará si vienen vacíos o no vienen.
    // Esto es solo si los haces @IsOptional() y quieres que '' -> null o 0 -> null.

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
    // Primero, encuentra el menú existente
    const menuToUpdate = await this.menuRepository.findOne({ where: { id } });

    if (!menuToUpdate) {
      throw new NotFoundException(`Menu item with ID ${id} not found.`);
    }

    // CORRECCIÓN CLAVE: Usar Object.assign para copiar las propiedades del DTO
    // Esto asegura que si una propiedad en updateMenuDto es null (porque @Transform la convirtió de ''),
    // ese null se aplique a la entidad. Si la propiedad no está en updateMenuDto,
    // Object.assign no la tocará, lo cual es el comportamiento deseado para un PATCH.
    Object.assign(menuToUpdate, updateMenuDto);

    // Guardar los cambios
    const updatedMenu = await this.menuRepository.save(menuToUpdate);

    // Opcional: Cargar y devolver el menú completo con relaciones si es necesario
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
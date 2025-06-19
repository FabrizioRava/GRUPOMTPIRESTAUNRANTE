import { Injectable, NotFoundException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant/restaurant.entity';
import { Menu } from '../entities/menu/menu.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateMenuDto } from '../menu/dto/create-menu.dto';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
  ) {}

  /**
   * Crea un nuevo restaurante
   * @param createRestaurantDto - Datos del restaurante
   * @param userId - ID del usuario creador
   * @returns Restaurante creado
   */
  async createRestaurant(createRestaurantDto: CreateRestaurantDto, userId: number): Promise<Restaurant> {
    // Validar que cityId sea un número si existe
    if (createRestaurantDto.address?.cityId) {
      createRestaurantDto.address.cityId = Number(createRestaurantDto.address.cityId);
    }

    // Aquí usamos Object.assign para copiar las propiedades del DTO a una nueva instancia de Restaurant,
    // y luego asignamos userId por separado. Esto maneja correctamente la compatibilidad de tipos.
    const restaurant = this.restaurantRepository.create(createRestaurantDto);
    restaurant.userId = userId; // Asignar userId directamente a la entidad
    
    return this.restaurantRepository.save(restaurant);
  }

  /**
   * Crea un menú para un restaurante
   * @param restaurantId - ID del restaurante
   * @param createMenuDto - Datos del menú
   * @returns Menú creado
   */
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

  /**
   * Obtiene todos los restaurantes
   * @param cityId - ID de la ciudad para filtrar (opcional)
   * @param ownerUserId - ID del dueño para filtrar (opcional)
   * @returns Lista de restaurantes
   */
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

  /**
   * Obtiene un restaurante por ID
   * @param id - ID del restaurante
   * @returns Restaurante encontrado
   */
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

  /**
   * Obtiene los menús de un restaurante
   * @param restaurantId - ID del restaurante
   * @returns Lista de menús
   */
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

  /**
   * Actualiza un restaurante
   * @param id - ID del restaurante a actualizar
   * @param updateDto - Datos de actualización
   * @param userId - ID del usuario que realiza la actualización
   * @returns Restaurante actualizado
   */
  async update(id: number, updateDto: UpdateRestaurantDto, userId: number): Promise<Restaurant> {
    // Validar y convertir cityId a número si existe
    if (updateDto.address?.cityId) {
      updateDto.address.cityId = Number(updateDto.address.cityId);
    }

    const restaurant = await this.restaurantRepository.findOne({
      where: { id },
      // No necesitas 'menus' aquí a menos que vayas a actualizar los menús directamente en este método
      // Si solo son datos del restaurante, no es necesario cargar las relaciones por defecto
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurante con ID ${id} no encontrado`);
    }

    if (restaurant.userId !== userId) {
      throw new ForbiddenException(`No tiene permiso para actualizar este restaurante`);
    }

    // CORRECCIÓN CLAVE 1:
    // Utiliza Object.assign para copiar las propiedades del DTO al objeto de la entidad existente.
    // Esto asegura que si una propiedad está presente en el DTO (incluso si es null o ''),
    // se sobrescriba el valor existente en la entidad.
    // TypeORM mapea automáticamente los campos del DTO a la entidad si los nombres coinciden.
    Object.assign(restaurant, updateDto);

    // Si tu TypeORM Entity para `Address` y `Location` también usa interfaces (como tú las definiste),
    // `Object.assign` las sobrescribirá correctamente.

    // Si `updateDto.address` está presente, asegúrate de que el objeto `address` dentro de `restaurant`
    // también se actualice correctamente con las subpropiedades.
    // Esto es especialmente importante para `jsonb` donde quieres una fusión profunda.
    if (updateDto.address) {
      // Si `address` es un objeto JSONB en la DB, TypeORM lo cargará como un objeto JS.
      // Puedes fusionar las propiedades de `updateDto.address` en `restaurant.address`.
      // Asegúrate de que `restaurant.address` exista para no intentar fusionar en `null`.
      restaurant.address = {
        ...restaurant.address, // Mantener las propiedades existentes de la dirección
        ...updateDto.address,  // Sobrescribir con las propiedades proporcionadas en el DTO
        location: { // Asegurar la fusión de la ubicación anidada
          ...(restaurant.address?.location || {}), // Mantener lat/lng existentes si no se proporcionan
          ...(updateDto.address.location || {})    // Sobrescribir con lat/lng del DTO
        }
      };
    }

    // Guardar cambios. TypeORM detectará las diferencias y generará el UPDATE SQL.
    await this.restaurantRepository.save(restaurant);
    
    // Devolver el restaurante actualizado, cargándolo de nuevo para asegurar
    // que se reflejen todos los cambios persistidos y las relaciones.
    return this.findOne(id);
  }

  /**
   * Elimina un restaurante
   * @param id - ID del restaurante a eliminar
   * @param userId - ID del usuario que realiza la eliminación
   */
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
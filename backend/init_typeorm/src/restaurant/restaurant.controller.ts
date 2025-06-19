import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Query, // Importamos Query para manejar los parámetros de consulta
} from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateMenuDto } from '../menu/dto/create-menu.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Asegúrate de que este guard sea correcto

@Controller('restaurants') // Mejor en plural para convención REST
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  /**
   * Crea un nuevo restaurante.
   * El userId se extrae automáticamente del token JWT del usuario autenticado.
   * @param createRestaurantDto - Datos del restaurante enviados por el cliente.
   * @param req - El objeto de solicitud, poblado por JwtAuthGuard con la información del usuario.
   * @returns El restaurante creado.
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @Request() req, // Inyectamos el objeto Request
  ) {
    // EXTRAER userId AHORA DESDE req.user.userId
    const userId = req.user.userId; // El AuthService ahora devuelve userId como `userId`
    console.log(`[RestaurantController] UserId extraído del token (final):`, userId); // Para depuración
    
    return this.restaurantService.createRestaurant(createRestaurantDto, userId);
  }

  /**
   * Crea un menú para un restaurante existente.
   * @param id - ID del restaurante.
   * @param createMenuDto - Datos del menú.
   * @returns El menú creado.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/menus')
  @HttpCode(HttpStatus.CREATED)
  async addMenuToRestaurant(
    @Param('id') id: string,
    @Body() createMenuDto: CreateMenuDto,
  ) {
    return this.restaurantService.createMenuForRestaurant(+id, createMenuDto);
  }

  /**
   * Obtiene todos los restaurantes. Permite filtrar por cityId.
   * No requiere autenticación (para listado público).
   * @param cityId - ID opcional de la ciudad para filtrar, recibido como un parámetro de consulta.
   * @returns Lista de restaurantes.
   */
  @Get()
  async findAll(@Query('cityId') cityId?: string) { // cityId es opcional y de tipo string
    // Convertir cityId a número si está presente, ya que los parámetros de consulta son strings
    const parsedCityId = cityId ? parseInt(cityId, 10) : undefined;
    // Llama al servicio pasando el cityId y undefined para ownerUserId, ya que este es el endpoint público
    return this.restaurantService.findAll(parsedCityId, undefined);
  }

  /**
   * NUEVO ENDPOINT: Obtiene todos los restaurantes propiedad del usuario autenticado.
   * Requiere autenticación.
   * La URL será /restaurants/my-restaurantsnpm install axios
   * @param req - El objeto de solicitud para obtener el userId.
   * @returns Lista de restaurantes del usuario autenticado.
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-restaurants') // Define la ruta para "mis restaurantes"
  async findMyRestaurants(@Request() req) {
    const ownerUserId = req.user.userId; // Obtiene el userId del payload del JWT del usuario autenticado
    // Llama a findAll pasando undefined para cityId y el ownerUserId
    return this.restaurantService.findAll(undefined, ownerUserId);
  }

  /**
   * Obtiene un restaurante específico por ID.
   * No requiere autenticación.
   * @param id - ID del restaurante.
   * @returns El restaurante encontrado.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.restaurantService.findOne(+id);
  }

  /**
   * Obtiene todos los menús de un restaurante específico.
   * No requiere autenticación.
   * @param id - ID del restaurante.
   * @returns Lista de menús para el restaurante.
   */
  @Get(':id/menus')
  async findRestaurantMenus(@Param('id') id: string) {
    return this.restaurantService.findRestaurantMenus(+id);
  }

  /**
   * Actualiza completamente un restaurante existente (PUT).
   * Requiere autenticación. La lógica de verificación de propiedad se realizará en el servicio.
   * @param id - ID del restaurante a actualizar.
   * @param updateDto - Datos de actualización.
   * @param req - El objeto de solicitud para obtener el userId.
   * @returns El restaurante actualizado.
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id') // Endpoint PUT
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRestaurantDto,
    @Request() req, // Inyectamos Request para obtener userId
  ) {
    const userId = req.user.userId; // El AuthService ahora devuelve userId como `userId`
    return this.restaurantService.update(+id, updateDto, userId); // Pasamos userId al servicio
  }

  /**
   * Actualiza parcialmente un restaurante existente (PATCH).
   * Requiere autenticación. La lógica de verificación de propiedad se realizará en el servicio.
   * @param id - ID del restaurante a actualizar.
   * @param updateDto - Datos de actualización parcial.
   * @param req - El objeto de solicitud para obtener el userId.
   * @returns El restaurante actualizado.
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id') // Mantenido como PATCH y con tu nombre original 'partialUpdate'
  async partialUpdate(
    @Param('id') id: string,
    @Body() updateDto: UpdateRestaurantDto,
    @Request() req, // Inyectamos Request para obtener userId
  ) {
    const userId = req.user.userId; // El AuthService ahora devuelve userId como `userId`
    return this.restaurantService.update(+id, updateDto, userId); // Pasamos userId al servicio
  }

  /**
   * Elimina un restaurante.
   * Requiere autenticación. La lógica de verificación de propiedad se realizará en el servicio.
   * @param id - ID del restaurante a eliminar.
   * @param req - El objeto de solicitud para obtener el userId.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Request() req, // Inyectamos Request para obtener userId
  ) {
    const userId = req.user.userId; // El AuthService ahora devuelve userId como `userId`
    return this.restaurantService.remove(+id, userId); // Pasamos userId al servicio
  }
}
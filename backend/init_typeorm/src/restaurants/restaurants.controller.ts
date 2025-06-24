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
  Query, 
} from '@nestjs/common';
import { RestaurantService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateMenuDto } from '../menus/dto/create-menu.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 

@Controller('restaurants') 
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @Request() req, 
  ) {
    const userId = req.user.userId; 
    console.log(`[RestaurantController] UserId extraído del token (final):`, userId); 
    
    return this.restaurantService.createRestaurant(createRestaurantDto, userId);
  }


  @UseGuards(JwtAuthGuard)
  @Post(':id/menus')
  @HttpCode(HttpStatus.CREATED)
  async addMenuToRestaurant(
    @Param('id') id: string,
    @Body() createMenuDto: CreateMenuDto,
  ) {
    return this.restaurantService.createMenuForRestaurant(+id, createMenuDto);
  }


  @Get()
  async findAll(@Query('cityId') cityId?: string) { 
    const parsedCityId = cityId ? parseInt(cityId, 10) : undefined;
    return this.restaurantService.findAll(parsedCityId, undefined);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-restaurants') 
  async findMyRestaurants(@Request() req) {
    const ownerUserId = req.user.userId; 
    return this.restaurantService.findAll(undefined, ownerUserId);
  }


  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.restaurantService.findOne(+id);
  }

  @Get(':id/menus')
  async findRestaurantMenus(@Param('id') id: string) {
    return this.restaurantService.findRestaurantMenus(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id') 
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRestaurantDto,
    @Request() req, 
  ) {
    const userId = req.user.userId; 
    return this.restaurantService.update(+id, updateDto, userId); 
  }

 
  @UseGuards(JwtAuthGuard)
  @Patch(':id') 
  async partialUpdate(
    @Param('id') id: string,
    @Body() updateDto: UpdateRestaurantDto,
    @Request() req, 
  ) {
    const userId = req.user.userId; 
    return this.restaurantService.update(+id, updateDto, userId); 
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Request() req, 
  ) {
    const userId = req.user.userId; 
    return this.restaurantService.remove(+id, userId); 
  }
}
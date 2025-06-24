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
} from '@nestjs/common';
import { MenuService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createMenuDto: CreateMenuDto) {
    return this.menuService.create(createMenuDto);
  }

  @Get()
  findAll() {
    return this.menuService.findAll();
  }

  @Get('restaurant/:restaurantId')
  findByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.menuService.findByRestaurantId(+restaurantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto) {
    return this.menuService.update(+id, updateMenuDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  partialUpdate(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto) {
    return this.menuService.update(+id, updateMenuDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.menuService.remove(+id);
  }
}
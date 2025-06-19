// src/menu/dto/update-menu.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsUrl,
  IsOptional, // Sigue siendo opcional en el payload de PATCH
  ValidateIf, // Necesario para validar solo si el campo está presente
  IsInt,
  Min
} from 'class-validator';
import { Transform } from 'class-transformer';

import { CreateMenuDto } from './create-menu.dto';

export class UpdateMenuDto extends PartialType(CreateMenuDto) {
  @IsInt()
  @IsOptional()
  @ValidateIf(o => o.restaurantId !== undefined)
  restaurantId?: number;

  @IsString()
  @IsOptional() // Puede que el payload no incluya 'name'
  @IsNotEmpty() // Si 'name' está en el payload, NO puede ser una cadena vacía
  @ValidateIf(o => o.name !== undefined) // Solo valida IsNotEmpty si 'name' fue enviado
  name?: string;

  @IsString()
  @IsOptional() // Puede que el payload no incluya 'description'
  @IsNotEmpty() // Si 'description' está en el payload, NO puede ser una cadena vacía
  @ValidateIf(o => o.description !== undefined) // Solo valida IsNotEmpty si 'description' fue enviado
  description?: string; // Sin '| null' aquí

  @IsNumber()
  @IsOptional() // Puede que el payload no incluya 'price'
  @IsNotEmpty() // Si 'price' está en el payload, NO puede ser vacío (como 0)
  @Min(0)
  @ValidateIf(o => o.price !== undefined) // Solo valida IsNotEmpty/Min si 'price' fue enviado
  price?: number; // Sin '| null' aquí

  @IsString()
  @IsUrl()
  @IsOptional() // Puede que el payload no incluya 'imageUrl'
  @IsNotEmpty() // Si 'imageUrl' está en el payload, NO puede ser una cadena vacía
  @ValidateIf(o => o.imageUrl !== undefined) // Solo valida IsNotEmpty/IsUrl si 'imageUrl' fue enviado
  imageUrl?: string; // Sin '| null' aquí, solo string

  @IsString()
  @IsOptional() // Este sí es completamente opcional y puede ser nulo
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf(o => o.category !== undefined)
  category?: string | null;
}
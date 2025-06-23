import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsUrl,
  IsOptional, 
  ValidateIf, 
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
  @IsOptional() 
  @IsNotEmpty() 
  @ValidateIf(o => o.name !== undefined) 
  name?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty() 
  @ValidateIf(o => o.description !== undefined) 
  description?: string;

  @IsNumber()
  @IsOptional() 
  @IsNotEmpty() 
  @Min(0)
  @ValidateIf(o => o.price !== undefined)
  price?: number; 

  @IsString()
  @IsUrl()
  @IsOptional() 
  @IsNotEmpty() 
  @ValidateIf(o => o.imageUrl !== undefined) 
  imageUrl?: string; 

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf(o => o.category !== undefined)
  category?: string | null;
}
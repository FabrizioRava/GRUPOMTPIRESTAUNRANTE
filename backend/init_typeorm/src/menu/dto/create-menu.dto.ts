// src/menu/dto/create-menu.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsUrl, IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMenuDto {
  @IsInt()
  @IsNotEmpty()
  restaurantId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0) // Asegura que el precio sea al menos 0 (o 0.01 si no quieres 0)
  price: number;

  @IsString()
  @IsUrl()
  @IsNotEmpty() // Es obligatorio y debe ser una URL válida y no vacía
  imageUrl: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value)) // Transforma '' a null
  category?: string | null; // Es opcional y puede ser null
}
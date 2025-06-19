import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  ValidateNested,
  IsNumber,
  ValidateIf
} from 'class-validator';
import { Type, Transform } from 'class-transformer'; // <-- ¡IMPORTANTE: Añadir Transform aquí!
import { CreateRestaurantDto } from './create-restaurant.dto';

// DTO para ubicación
class UpdateLocationDto {
  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => o.location !== undefined)
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => o.location !== undefined)
  lng: number;
}

// DTO para dirección (renombrado de AddressDto a UpdateAddressDto para consistencia)
class UpdateAddressDto {
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => o.address !== undefined)
  street: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => o.address !== undefined)
  number: string;

  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => o.address !== undefined)
  cityId: number;

  @IsString()
  @ValidateIf(o => o.address?.city !== undefined)
  city?: string;

  @ValidateNested()
  @Type(() => UpdateLocationDto)
  @ValidateIf(o => o.address?.location !== undefined)
  location: UpdateLocationDto;
}

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => o.name !== undefined)
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @ValidateIf(o => o.imageUrl !== undefined)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  // Este decorador transforma la cadena vacía ('') que viene del frontend a null.
  // Esto es útil si tu columna en la base de datos prefiere NULL para campos opcionales sin valor,
  // o si TypeORM maneja mejor los nulls en tu contexto.
  @Transform(({ value }) => (value === '' ? null : value))
  description?: string | null; // El tipo también refleja que puede ser string o null

  @ValidateNested()
  @Type(() => UpdateAddressDto)
  @ValidateIf(o => o.address !== undefined)
  address?: UpdateAddressDto;
}
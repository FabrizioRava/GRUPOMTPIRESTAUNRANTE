import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  ValidateNested,
  IsNumber
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO for location (latitude and longitude)
export class LocationDto {
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  lng: number;
}

// DTO for address (street, number, city ID, and nested location)
export class AddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsNumber()
  @IsNotEmpty()
  cityId: number;

  @IsString()
  @IsOptional()
  city?: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}

// Main DTO for creating a restaurant
export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  imageUrl: string;

  @IsString()
  @IsOptional()
  // CORRECCIÓN CLAVE: Permite que 'description' sea también 'null'
  // Esto resuelve el error de TypeScript en UpdateRestaurantDto,
  // ya que 'PartialType' ahora entenderá que la propiedad original puede ser null.
  description?: string | null; // <-- CAMBIADO: Añadido '| null'

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  // IMPORTANT! userId has been removed from this DTO.
  // It will be injected by the controller from the JWT token.
}
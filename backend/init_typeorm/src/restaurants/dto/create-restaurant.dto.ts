import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  ValidateNested,
  IsNumber
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  lng: number;
}

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
  description?: string | null; 

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}
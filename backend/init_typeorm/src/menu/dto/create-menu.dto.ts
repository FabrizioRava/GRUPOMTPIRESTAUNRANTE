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
  @Min(0) 
  price: number;

  @IsString()
  @IsUrl()
  @IsNotEmpty() 
  imageUrl: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value)) 
  category?: string | null; 
}
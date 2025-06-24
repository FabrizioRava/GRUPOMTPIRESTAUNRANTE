import { IsEmail, IsNotEmpty, MinLength, IsString, IsNumber } from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name: string;

  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsNotEmpty({ message: 'El ID de la ciudad es obligatorio' })
  @IsNumber({}, { message: 'El ID de la ciudad debe ser un número' })
  cityId: number;
}
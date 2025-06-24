import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Debe ser un email válido.' })
  @IsNotEmpty({ message: 'El email es obligatorio.' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  password: string;
}
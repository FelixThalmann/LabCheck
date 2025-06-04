import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' })
  @IsNotEmpty({ message: 'Das E-Mail-Feld darf nicht leer sein.' })
  email!: string;

  @IsString({ message: 'Das Passwort muss eine Zeichenkette sein.' })
  @IsNotEmpty({ message: 'Das Passwort-Feld darf nicht leer sein.' })
  @MinLength(8, { message: 'Das Passwort muss mindestens 8 Zeichen lang sein.' })
  password!: string;
} 
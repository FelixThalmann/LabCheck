import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Data transfer object for user login
 * Validates email and password for authentication
 */
export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email field cannot be empty.' })
  email!: string;

  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password field cannot be empty.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;
} 
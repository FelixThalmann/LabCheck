import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Data transfer object for user registration
 * Validates username, email, and password for new user creation
 */
export class RegisterDto {
  @IsString({ message: 'Username must be a string.' })
  @IsNotEmpty({ message: 'Username field cannot be empty.' })
  @MinLength(3, { message: 'Username must be at least 3 characters long.' })
  username!: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email field cannot be empty.' })
  email!: string;

  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password field cannot be empty.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;
} 
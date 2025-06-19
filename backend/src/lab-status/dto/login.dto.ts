import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, Max, MinLength } from 'class-validator';

/**
 * @class LoginDto
 * @description DTO für das Login via REST API
 */
export class LoginDto {
  @ApiProperty({
    description: 'Administratorpasswort für die Kapazitätsänderung',
    example: 'admin123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}

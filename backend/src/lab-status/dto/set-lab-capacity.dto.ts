import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, Max, MinLength } from 'class-validator';

/**
 * @class SetLabCapacityDto
 * @description DTO für das Setzen der Laborkapazität via REST API
 * Entspricht der GraphQL setLabCapacity Mutation mit zusätzlichem Passwort-Schutz
 */
export class SetLabCapacityDto {
  @ApiProperty({
    description: 'Die neue Laborkapazität',
    example: 25,
    minimum: 1,
    maximum: 1000,
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity: number;

  @ApiProperty({
    description: 'Administratorpasswort für die Kapazitätsänderung',
    example: 'admin123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, Max } from 'class-validator';

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
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  capacity: number;

  @ApiProperty({
    description: 'Administratorpasswort für die Kapazitätsänderung',
  })
  @IsString()
  password: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, Max } from 'class-validator';

/**
 * @class SetCurrentLabCapacityDto
 * @description DTO für das Setzen der aktuellen Laborkapazität via REST API
 */
export class SetCurrentLabCapacityDto {
  @ApiProperty({
    description: 'Laborkapazität',
    example: 25,
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity: number;

  @ApiProperty({
    description: 'Administratorpasswort für die Kapazitätsänderung',
  })
  @IsString()
  password: string;
}

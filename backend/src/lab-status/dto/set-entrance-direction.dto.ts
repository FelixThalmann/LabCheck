import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, Max } from 'class-validator';

/**
 * @class SetEntranceDirectionDto
 * @description DTO für das Setzen der Eingangrichtung via REST API
 */
export class SetEntranceDirectionDto {
  @ApiProperty({
    description: 'Administratorpasswort für die Eingangrichtung',
  })
  @IsString()
  password: string;
}

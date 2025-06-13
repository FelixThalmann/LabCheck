import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsIn, Min, IsOptional } from 'class-validator';

/**
 * @class PredictionItemDto
 * @description DTO für einzelne Vorhersage-Items
 * Wird sowohl für Tages- als auch Wochenvorhersagen verwendet
 */
export class PredictionItemDto {
  @ApiProperty({ 
    description: 'Vorhergesagte Anzahl Personen',
    example: 4,
    minimum: 0 
  })
  @IsInt()
  @Min(0)
  occupancy: number;

  @ApiProperty({ 
    description: 'Uhrzeit der Vorhersage (nur für Tagesvorhersagen)',
    example: '10 AM',
    required: false 
  })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiProperty({ 
    description: 'Wochentag der Vorhersage (nur für Wochenvorhersagen)',
    example: 'Tue',
    required: false 
  })
  @IsOptional()
  @IsString()
  day?: string;

  @ApiProperty({ 
    description: 'Farbkodierung der Vorhersage',
    example: 'yellow',
    enum: ['green', 'yellow', 'red'] 
  })
  @IsString()
  @IsIn(['green', 'yellow', 'red'])
  color: string;
}

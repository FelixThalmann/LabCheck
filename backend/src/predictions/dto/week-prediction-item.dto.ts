import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsIn, Min, IsDateString } from 'class-validator';

/**
 * @class WeekPredictionItemDto
 * @description Erweiterte DTO für Wochenvorhersage-Items mit Datum
 * Verwendet für die neue erweiterte Wochenvorhersage-API
 */
export class WeekPredictionItemDto {
  @ApiProperty({
    description: 'Vorhergesagte Anzahl Personen',
    example: 4,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  occupancy: number;

  @ApiProperty({
    description: 'Wochentag der Vorhersage',
    example: 'Tue',
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  })
  @IsString()
  @IsIn(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  day: string;

  @ApiProperty({
    description: 'Farbkodierung der Vorhersage',
    example: 'yellow',
    enum: ['green', 'yellow', 'red'],
  })
  @IsString()
  @IsIn(['green', 'yellow', 'red'])
  color: string;

  @ApiProperty({
    description: 'Datum der Vorhersage im YYYY-MM-DD Format',
    example: '2025-01-15',
  })
  @IsDateString()
  date: string;
}

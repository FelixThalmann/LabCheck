import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PredictionItemDto } from './prediction-item.dto';

/**
 * @class WeekPredictionResponseDto
 * @description DTO für die REST API Response der Wochenvorhersagen
 * Entspricht der API-Spezifikation für GET /api/predictions/week
 */
export class WeekPredictionResponseDto {
  @ApiProperty({
    description: 'Liste der Vorhersagen für die Woche',
    type: [PredictionItemDto],
    example: [
      { occupancy: 1, day: 'Mon', color: 'green' },
      { occupancy: 4, day: 'Tue', color: 'yellow' },
      { occupancy: 5, day: 'Wed', color: 'red' },
      { occupancy: 4, day: 'Thu', color: 'yellow' },
      { occupancy: 2, day: 'Fri', color: 'green' },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => PredictionItemDto)
  predictions: PredictionItemDto[];

  @ApiProperty({
    description: 'Zeitpunkt der letzten Aktualisierung (ISO 8601)',
    example: '2024-01-15T14:25:00.000Z',
  })
  @IsDateString()
  lastUpdated: string;
}

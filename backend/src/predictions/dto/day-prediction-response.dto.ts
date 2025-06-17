import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PredictionItemDto } from './prediction-item.dto';

/**
 * @class DayPredictionResponseDto
 * @description DTO für die REST API Response der Tagesvorhersagen
 * Entspricht der API-Spezifikation für GET /api/predictions/day
 */
export class DayPredictionResponseDto {
  @ApiProperty({ 
    description: 'Liste der Vorhersagen für den Tag',
    type: [PredictionItemDto],
    example: [
      { occupancy: 1, time: '8 AM', color: 'green' },
      { occupancy: 4, time: '10 AM', color: 'yellow' },
      { occupancy: 5, time: '12 PM', color: 'red' },
      { occupancy: 4, time: '2 PM', color: 'yellow' },
      { occupancy: 2, time: '4 PM', color: 'green' },
      { occupancy: 1, time: '6 PM', color: 'green' }
    ]
  })
  @ValidateNested({ each: true })
  @Type(() => PredictionItemDto)
  predictions: PredictionItemDto[];

  @ApiProperty({ 
    description: 'Zeitpunkt der letzten Aktualisierung (ISO 8601)',
    example: '2024-01-15T14:25:00.000Z' 
  })
  @IsDateString()
  lastUpdated: string;
}

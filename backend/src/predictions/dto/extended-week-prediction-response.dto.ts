import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { WeekPredictionItemDto } from './week-prediction-item.dto';

/**
 * @class ExtendedWeekPredictionResponseDto
 * @description DTO für erweiterte Wochenvorhersagen mit aktueller und nächster Woche
 * Erweitert die bestehende API um Vorhersagen für zwei Wochen
 */
export class ExtendedWeekPredictionResponseDto {
  @ApiProperty({
    description: 'Vorhersagen für die aktuelle Woche (Montag-Freitag)',
    type: [WeekPredictionItemDto],
    example: [
      { occupancy: 3, day: 'Mon', color: 'green', date: '2025-01-13' },
      { occupancy: 7, day: 'Tue', color: 'yellow', date: '2025-01-14' },
      { occupancy: 12, day: 'Wed', color: 'red', date: '2025-01-15' },
      { occupancy: 8, day: 'Thu', color: 'yellow', date: '2025-01-16' },
      { occupancy: 4, day: 'Fri', color: 'green', date: '2025-01-17' },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => WeekPredictionItemDto)
  currentWeek: WeekPredictionItemDto[];

  @ApiProperty({
    description: 'Vorhersagen für die nächste Woche (Montag-Freitag)',
    type: [WeekPredictionItemDto],
    example: [
      { occupancy: 5, day: 'Mon', color: 'yellow', date: '2025-01-20' },
      { occupancy: 9, day: 'Tue', color: 'yellow', date: '2025-01-21' },
      { occupancy: 15, day: 'Wed', color: 'red', date: '2025-01-22' },
      { occupancy: 6, day: 'Thu', color: 'yellow', date: '2025-01-23' },
      { occupancy: 3, day: 'Fri', color: 'green', date: '2025-01-24' },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => WeekPredictionItemDto)
  nextWeek: WeekPredictionItemDto[];

  @ApiProperty({
    description: 'Zeitpunkt der letzten Aktualisierung (ISO 8601)',
    example: '2025-01-15T14:25:00.000Z',
  })
  @IsDateString()
  lastUpdated: string;
}

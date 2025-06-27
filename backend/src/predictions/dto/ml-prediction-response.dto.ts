import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsISO8601 } from 'class-validator';

/**
 * @class MLPredictionResponseDto
 * @description DTO für die Antwort vom FastAPI ML-Service
 * Entspricht der PredictionResponse aus dem FastAPI Service
 */
export class MLPredictionResponseDto {
  @ApiProperty({
    description: 'Vorhergesagte Personenanzahl',
    example: 4.5,
    minimum: 0,
  })
  @IsNumber()
  predicted_occupancy: number;

  @ApiProperty({
    description: 'Vorhersage ob die Tür offen ist',
    example: true,
  })
  @IsBoolean()
  prediction_isDoorOpen: boolean;

  @ApiProperty({
    description: 'Zeitstempel für den die Vorhersage gemacht wurde',
    example: '2025-06-19T14:30:00.000Z',
    format: 'date-time',
  })
  @IsISO8601()
  prediction_for_timestamp: string;

  @ApiProperty({
    description: 'Zeitstempel wann das Modell zuletzt trainiert wurde',
    example: '2025-06-19T10:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  @IsISO8601()
  last_trained_at: string | null;
}

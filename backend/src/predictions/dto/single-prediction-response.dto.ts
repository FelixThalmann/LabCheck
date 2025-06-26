import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsISO8601, IsString, IsIn, Min } from 'class-validator';

/**
 * @class SinglePredictionResponseDto
 * @description DTO für einzelne Vorhersagen an das Frontend
 * Transformiert ML-Service Response in einheitliches Frontend-Format
 */
export class SinglePredictionResponseDto {
  @ApiProperty({
    description: 'Vorhergesagte Personenanzahl (gerundet)',
    example: 5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  predictedOccupancy: number;

  @ApiProperty({
    description: 'Vorhersage ob die Tür offen ist',
    example: true,
  })
  @IsBoolean()
  isDoorOpen: boolean;

  @ApiProperty({
    description: 'Zeitstempel für den die Vorhersage gemacht wurde',
    example: '2025-06-19T14:30:00.000Z',
    format: 'date-time',
  })
  @IsISO8601()
  predictionTimestamp: string;

  @ApiProperty({
    description: 'Farbkodierung basierend auf der Belegung',
    example: 'yellow',
    enum: ['green', 'yellow', 'red'],
  })
  @IsString()
  @IsIn(['green', 'yellow', 'red'])
  color: string;

  @ApiProperty({
    description: 'Zeitstempel wann das Modell zuletzt trainiert wurde',
    example: '2025-06-19T10:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  @IsISO8601()
  lastTrainedAt: string | null;

  @ApiProperty({
    description: 'Zeitstempel der API-Antwort',
    example: '2025-06-19T14:31:15.123Z',
    format: 'date-time',
  })
  @IsISO8601()
  responseTimestamp: string;
}

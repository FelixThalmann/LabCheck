import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsISO8601 } from 'class-validator';

/**
 * @class PredictionRequestDto
 * @description DTO für ML-Prediction Anfragen
 * Definiert die erforderlichen Parameter für einzelne Vorhersagen
 */
export class PredictionRequestDto {
  @ApiProperty({
    description: 'Zeitstempel für die Vorhersage im ISO 8601 Format',
    example: '2025-06-19T14:30:00',
    format: 'date-time'
  })
  @IsString()
  @IsISO8601()
  timestamp: string;
}

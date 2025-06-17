import { ApiProperty } from '@nestjs/swagger';

/**
 * @class LabSettingResponseDto
 * @description DTO für die Antwort beim Setzen von Laboreinstellungen
 * Entspricht dem LabSettingModel aus GraphQL
 */
export class LabSettingResponseDto {
  @ApiProperty({
    description: 'Einstellungsschlüssel',
    example: 'lab_total_capacity',
  })
  key: string;

  @ApiProperty({
    description: 'Einstellungswert',
    example: '25',
  })
  value: string;

  @ApiProperty({
    description: 'Optionale Notizen zur Einstellung',
    example: 'Kapazität wurde für Wintermonate angepasst',
    required: false,
  })
  notes?: string;

  @ApiProperty({
    description: 'Erstellungszeitpunkt (ISO 8601)',
    example: '2024-01-15T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Aktualisierungszeitpunkt (ISO 8601)',
    example: '2024-01-15T14:25:00.000Z',
  })
  updatedAt: string;
}

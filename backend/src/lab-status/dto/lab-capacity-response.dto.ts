import { ApiProperty } from '@nestjs/swagger';

/**
 * @class LabCapacityResponseDto
 * @description DTO für die Antwort beim Abrufen der Laborkapazität
 */
export class LabCapacityResponseDto {
  @ApiProperty({
    description: 'Aktuelle Laborkapazität',
    example: 20,
  })
  capacity: number;

  @ApiProperty({
    description: 'Zeitpunkt der letzten Änderung (ISO 8601)',
    example: '2024-01-15T14:25:00.000Z',
  })
  lastUpdated: string;
}

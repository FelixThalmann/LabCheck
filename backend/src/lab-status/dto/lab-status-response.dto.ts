import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString, IsIn, IsDateString, Min } from 'class-validator';

/**
 * @class LabStatusResponseDto
 * @description DTO für die REST API Response des Laborstatus
 * Entspricht der API-Spezifikation für GET /api/lab/status
 */
export class LabStatusResponseDto {
  @ApiProperty({ 
    description: 'Gibt an, ob das Labor geöffnet ist',
    example: true 
  })
  @IsBoolean()
  isOpen: boolean;

  @ApiProperty({ 
    description: 'Aktuelle Anzahl Personen im Labor',
    example: 3,
    minimum: 0 
  })
  @IsInt()
  @Min(0)
  currentOccupancy: number;

  @ApiProperty({ 
    description: 'Maximale Kapazität des Labors',
    example: 5,
    minimum: 0 
  })
  @IsInt()
  @Min(0)
  maxOccupancy: number;

  @ApiProperty({ 
    description: 'Farbkodierung basierend auf Belegung',
    example: 'yellow',
    enum: ['green', 'yellow', 'red'] 
  })
  @IsString()
  @IsIn(['green', 'yellow', 'red'])
  color: string;

  @ApiProperty({ 
    description: 'Aktuelles Datum/Zeit (ISO 8601)',
    example: '2024-01-15T14:30:00.000Z' 
  })
  @IsDateString()
  currentDate: string;

  @ApiProperty({ 
    description: 'Zeitpunkt der letzten Aktualisierung (ISO 8601)',
    example: '2024-01-15T14:25:00.000Z' 
  })
  @IsDateString()
  lastUpdated: string;
}

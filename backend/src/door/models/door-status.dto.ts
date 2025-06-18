import { IsString, IsBoolean, IsDateString, IsOptional } from 'class-validator';

/**
 * DTO for current door status
 * Represents the current state of a door sensor
 */
export class DoorStatusDto {
  /** Optional unique identifier for the door status */
  @IsOptional()
  @IsString()
  id?: string;

  /** Whether the door is currently open */
  @IsBoolean()
  isOpen: boolean;

  /** Timestamp of the current status */
  @IsDateString()
  timestamp: Date;

  /** Identifier of the sensor providing the status */
  @IsString()
  sensorId: string;
}

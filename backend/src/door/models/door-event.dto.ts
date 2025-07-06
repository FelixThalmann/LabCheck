import { IsString, IsBoolean, IsDateString } from 'class-validator';

/**
 * DTO for door event data
 * Contains information about door open/close events from sensors
 */
export class DoorEventDto {
  /** Unique identifier for the door event */
  @IsString()
  id: string;

  /** Whether the door is currently open */
  @IsBoolean()
  doorIsOpen: boolean;

  /** Timestamp when the event occurred */
  @IsDateString()
  eventTimestamp: Date;

  /** Identifier of the sensor that detected the event */
  @IsString()
  sensorId: string;
}

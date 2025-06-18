import { IsString, IsDateString, IsEnum } from 'class-validator';
import { PassageDirection } from '@prisma/client';

/**
 * DTO for passage events
 * Contains information about people passing through doors (IN/OUT)
 */
export class PassageEventDto {
  /** Unique identifier for the passage event */
  @IsString()
  id: string;

  /** Timestamp when the passage event occurred */
  @IsDateString()
  eventTimestamp: Date;

  /** Direction of the passage (IN or OUT) */
  @IsEnum(PassageDirection)
  direction: PassageDirection;

  /** Identifier of the sensor that detected the passage */
  @IsString()
  sensorId: string;
}

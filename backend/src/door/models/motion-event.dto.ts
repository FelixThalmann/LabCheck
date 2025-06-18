import { IsString, IsBoolean, IsDateString } from 'class-validator';

/**
 * DTO for motion detection events
 * Contains information about motion detected by sensors
 */
export class MotionEventDto {
  /** Unique identifier for the motion event */
  @IsString()
  id: string;

  /** Timestamp when the motion event occurred */
  @IsDateString()
  eventTimestamp: Date;

  /** Whether motion was detected */
  @IsBoolean()
  motionDetected: boolean;

  /** Identifier of the sensor that detected the motion */
  @IsString()
  sensorId: string;
}

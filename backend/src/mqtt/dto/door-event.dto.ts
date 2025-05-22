import { IsBoolean, IsISO8601, IsNotEmpty, IsOptional } from 'class-validator';

export class MqttDoorDataDto {
  @IsBoolean()
  @IsNotEmpty()
  isOpen: boolean;

  @IsISO8601()
  @IsOptional() // Zeitstempel kann optional vom Sensor kommen, sonst setzt Backend ihn
  timestamp?: string;
} 
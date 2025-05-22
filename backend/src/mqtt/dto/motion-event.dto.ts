import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';

export class MqttMotionDataDto {
  @IsBoolean()
  @IsOptional()
  motionDetected?: boolean; // Wird standardmäßig auf true gesetzt, falls nicht vorhanden

  @IsISO8601()
  @IsOptional()
  timestamp?: string;
} 
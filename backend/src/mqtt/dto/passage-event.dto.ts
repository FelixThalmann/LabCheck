import { IsEnum, IsISO8601, IsNotEmpty, IsOptional } from 'class-validator';
import { PassageDirection } from '@prisma/client'; // Importiere Enum aus Prisma generiertem Client

export class MqttPassageDataDto {
  @IsEnum(PassageDirection)
  @IsNotEmpty()
  direction: PassageDirection;

  @IsISO8601()
  @IsOptional()
  timestamp?: string;

  // Hier könnten optional auch die Rohdaten der ToF-Sensoren für eine komplexere Richtungsableitung im Backend rein
  // z.B. tof1Timestamp?: string, tof2Timestamp?: string;
} 
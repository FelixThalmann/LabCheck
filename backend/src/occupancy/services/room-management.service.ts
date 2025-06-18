/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Room } from '@prisma/client';

/**
 * @class RoomManagementService
 * @description Service für die Verwaltung von Räumen und automatische Raum-Zuordnung für Sensoren.
 * Stellt sicher, dass immer ein Default-Room existiert für neu erstellte Sensoren.
 */
@Injectable()
export class RoomManagementService {
  private readonly logger = new Logger(RoomManagementService.name);
  private readonly DEFAULT_ROOM_NAME = 'LabCheck-Main-Room';
  
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @method ensureDefaultRoomExists
   * @description Stellt sicher, dass ein Default-Room existiert. Erstellt ihn falls nicht vorhanden.
   * Dieser Room wird für alle Sensoren verwendet, die keine explizite Room-Zuordnung haben.
   * 
   * @returns {Promise<Room>} Der Default-Room
   */
  async ensureDefaultRoomExists(): Promise<Room> {
    this.logger.verbose(`Checking if default room '${this.DEFAULT_ROOM_NAME}' exists`);
    
    // Prüfe, ob Default-Room bereits existiert
    let defaultRoom = await this.prisma.room.findFirst({
      where: { name: this.DEFAULT_ROOM_NAME }
    });
    
    if (!defaultRoom) {
      this.logger.log(`Default room '${this.DEFAULT_ROOM_NAME}' not found. Creating new default room.`);
      
      try {
        defaultRoom = await this.prisma.room.create({
          data: {
            name: this.DEFAULT_ROOM_NAME,
            description: 'Auto-created default room for LabCheck sensors without explicit room assignment',
            capacity: 0,        // Startet mit 0 Personen
            maxCapacity: 20,    // Standard-Maximalkapazität
            isOpen: true        // Raum ist standardmäßig geöffnet
          }
        });
        
        this.logger.log(`Successfully created default room: ID ${defaultRoom.id}, Name: '${defaultRoom.name}'`);
      } catch (error) {
        this.logger.error(
          `Failed to create default room. Error: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined
        );
        throw error;
      }
    } else {
      this.logger.verbose(`Default room found: ID ${defaultRoom.id}, Name: '${defaultRoom.name}'`);
    }
    
    return defaultRoom;
  }

  /**
   * @method assignSensorToDefaultRoom
   * @description Weist einen Sensor dem Default-Room zu, falls er noch keinen Room hat.
   * 
   * @param {string} sensorId - Die ID des Sensors
   * @returns {Promise<Room | null>} Der zugewiesene Room oder null bei Fehlern
   */
  async assignSensorToDefaultRoom(sensorId: string): Promise<Room | null> {
    this.logger.verbose(`Attempting to assign sensor ${sensorId} to default room`);
    
    try {
      // Prüfe aktuellen Sensor-Status
      const sensor = await this.prisma.sensor.findUnique({
        where: { id: sensorId },
        include: { room: true }
      });
      
      if (!sensor) {
        this.logger.error(`Sensor with ID ${sensorId} not found`);
        return null;
      }
      
      if (sensor.roomId) {
        this.logger.verbose(`Sensor ${sensorId} already assigned to room ${sensor.roomId}`);
        return sensor.room;
      }
      
      // Hole Default-Room und weise zu
      const defaultRoom = await this.ensureDefaultRoomExists();
      
      await this.prisma.sensor.update({
        where: { id: sensorId },
        data: { roomId: defaultRoom.id }
      });
      
      this.logger.log(`Successfully assigned sensor ${sensorId} (ESP32: ${sensor.esp32Id}) to default room ${defaultRoom.id}`);
      return defaultRoom;
      
    } catch (error) {
      this.logger.error(
        `Failed to assign sensor ${sensorId} to default room. Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      return null;
    }
  }
}

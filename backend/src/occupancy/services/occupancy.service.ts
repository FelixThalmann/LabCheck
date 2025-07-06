/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EventsGateway } from '../../events/events/events.gateway';
import { OccupancyStatusDto } from '../../door/models/occupancy-status.dto';

/**
 * Service for managing room occupancy based on sensor events
 * Handles automatic updates of current occupancy (capacity)
 * in the Room table based on incoming passage events
 */
@Injectable()
export class OccupancyService {
  private readonly logger = new Logger(OccupancyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway?: EventsGateway, // Optional for WebSocket updates
  ) {}

  /**
   * Updates room occupancy based on a passage event
   * Uses transactions for atomic operations and prevents race conditions
   *
   * Technical flow:
   * 1. Load sensor with associated room
   * 2. Read and update current room occupancy in a transaction
   * 3. Validation: occupancy must not be negative or exceed maxCapacity
   * 4. Send WebSocket update to all connected clients
   *
   * @param sensorId - The database ID of the sensor
   * @param direction - The direction of the passage event (IN or OUT)
   * @returns Promise with new occupancy and room ID or null on errors
   */
  async updateRoomOccupancy(
    sensorId: string,
    direction: string,
  ): Promise<{ newOccupancy: number; roomId: string } | null> {
    this.logger.verbose(
      `Updating room occupancy for sensor ${sensorId}, direction: ${direction}`,
    );

    try {
      // Use a Prisma transaction for atomic operations
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Load sensor with associated room
        const sensor = await tx.sensor.findUnique({
          where: { id: sensorId },
          include: { room: true },
        });

        if (!sensor) {
          this.logger.error(`Sensor with ID ${sensorId} not found`);
          return null;
        }

        if (!sensor.room) {
          this.logger.warn(
            `Sensor ${sensorId} (ESP32: ${sensor.esp32Id}) is not assigned to any room. Cannot update occupancy.`,
          );
          return null;
        }

        // 2. Calculate current room occupancy based on entrance direction
        const entranceDirection = sensor.room.entranceDirection ?? 'left';
        this.logger.debug(`Room entrance direction: ${entranceDirection}, Passage direction: ${direction}, Current capacity: ${sensor.room.capacity}`);
        
        let capacityChange: number;
        if (entranceDirection === 'left') {
          capacityChange = direction === 'IN' ? 1 : -1;
          this.logger.debug(`Left entrance logic: ${direction} = ${direction === 'IN' ? '+' : '-'}1`);
        } else {
          capacityChange = direction === 'IN' ? -1 : 1;
          this.logger.debug(`Right entrance logic: ${direction} = ${direction === 'IN' ? '-' : '+'}1`);
        }
        
        const currentCapacity = sensor.room.capacity;
        const maxCapacity = sensor.room.maxCapacity;
        const newCapacity = currentCapacity + capacityChange;

        // 3. Apply bounds checking - no change if it would go out of bounds
        if (newCapacity < 0) {
          this.logger.warn(
            `Attempted to set negative occupancy for room ${sensor.room.name} (ID: ${sensor.room.id}). ` +
              `Current: ${currentCapacity}, Change: ${capacityChange}. Keeping current capacity.`,
          );
          return { newOccupancy: currentCapacity, roomId: sensor.room.id };
        }

        if (newCapacity > maxCapacity) {
          this.logger.warn(
            `Attempted to exceed maximum capacity for room ${sensor.room.name} (ID: ${sensor.room.id}). ` +
              `New: ${newCapacity}, Max: ${maxCapacity}. Keeping current capacity.`,
          );
          return { newOccupancy: currentCapacity, roomId: sensor.room.id };
        }

        // 4. Normal occupancy update
        await tx.room.update({
          where: { id: sensor.room.id },
          data: {
            capacity: newCapacity,
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          `Successfully updated occupancy for room ${sensor.room.name} (ID: ${sensor.room.id}): ` +
            `${currentCapacity} → ${newCapacity} (${direction === 'IN' ? '+1' : '-1'}) [entrance: ${entranceDirection}]`,
        );

        return { newOccupancy: newCapacity, roomId: sensor.room.id };
      });

      // 5. Send WebSocket update (outside transaction)
      if (result && this.eventsGateway) {
        await this.sendOccupancyUpdate(result.roomId, result.newOccupancy);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update room occupancy for sensor ${sensorId}, direction: ${direction}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  /**
   * @method getCurrentOccupancyStatus
   * @description Holt den aktuellen Belegungsstatus für einen Raum und formatiert ihn als OccupancyStatusDto.
   *
   * @param {string} roomId - Die ID des Raums
   * @returns {Promise<OccupancyStatusDto | null>} Aktueller Belegungsstatus oder null bei Fehlern
   */
  async getCurrentOccupancyStatus(
    roomId: string,
  ): Promise<OccupancyStatusDto | null> {
    try {
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        this.logger.error(`Room with ID ${roomId} not found`);
        return null;
      }

      // Berechne den Belegungsgrad in Prozent
      const percentageFull =
        room.maxCapacity > 0
          ? Math.round((room.capacity / room.maxCapacity) * 100)
          : 0;

      const occupancyStatus: OccupancyStatusDto = {
        currentOccupancy: room.capacity,
        totalCapacity: room.maxCapacity,
        timestamp: new Date(),
        percentageFull,
      };

      return occupancyStatus;
    } catch (error) {
      this.logger.error(
        `Failed to get current occupancy status for room ${roomId}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  /**
   * @method updateRoomOpenStatus
   * @description Setzt den Öffnungs-/Schließungsstatus eines Raums basierend auf der Sensor-ID.
   * Verwendet die gleiche Sensor-zu-Raum-Zuordnung wie updateRoomOccupancy.
   * Nutzt Transaktionen für atomare Operationen und verhindert Race Conditions.
   *
   * Technischer Ablauf:
   * 1. Sensor mit zugehörigem Raum laden (gleiche Logik wie updateRoomOccupancy)
   * 2. Room-Status in einer Transaktion atomisch aktualisieren
   * 3. WebSocket-Update an alle verbundenen Clients senden
   *
   * @param {string} sensorId - Die Datenbank-ID des Sensors (wie in updateRoomOccupancy)
   * @param {boolean} isOpen - Der neue Öffnungsstatus des Raums (true = offen, false = geschlossen)
   * @returns {Promise<{ roomId: string; roomName: string; isOpen: boolean } | null>} Room-Info oder null bei Fehlern
   */
  async updateRoomOpenStatus(
    sensorId: string,
    isOpen: boolean,
  ): Promise<{ roomId: string; roomName: string; isOpen: boolean } | null> {
    this.logger.verbose(
      `Updating room open status for sensor ${sensorId}, isOpen: ${isOpen}`,
    );

    try {
      // Verwende eine Prisma-Transaktion für atomare Operationen (wie in updateRoomOccupancy)
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Sensor mit zugehörigem Raum laden (exakt gleiche Logik wie updateRoomOccupancy)
        const sensor = await tx.sensor.findUnique({
          where: { id: sensorId },
          include: { room: true },
        });

        if (!sensor) {
          this.logger.error(`Sensor with ID ${sensorId} not found`);
          return null;
        }

        if (!sensor.room) {
          this.logger.warn(
            `Sensor ${sensorId} (ESP32: ${sensor.esp32Id}) is not assigned to any room. Cannot update room status.`,
          );
          return null;
        }

        // 2. Room-Status atomisch aktualisieren
        await tx.room.update({
          where: { id: sensor.room.id },
          data: {
            isOpen: isOpen,
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          `Successfully updated room status for room ${sensor.room.name} (ID: ${sensor.room.id}): ` +
            `isOpen = ${isOpen} (triggered by sensor ${sensor.esp32Id})`,
        );

        return {
          roomId: sensor.room.id,
          roomName: sensor.room.name,
          isOpen: isOpen,
        };
      });

      // 3. WebSocket-Update senden (außerhalb der Transaktion, wie in updateRoomOccupancy)
      if (result && this.eventsGateway) {
        await this.sendRoomStatusUpdate(result.roomId, result.isOpen);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update room open status for sensor ${sensorId}, isOpen: ${isOpen}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  /**
   * @private
   * @method sendOccupancyUpdate
   * @description Sendet ein WebSocket-Update über die Belegungsänderung an alle verbundenen Clients,
   * inklusive der maximalen Kapazität des Raums.
   *
   * @param {string} roomId - Die ID des Raums
   * @param {number} newOccupancy - Die neue Belegung
   */
  private async sendOccupancyUpdate(
    roomId: string,
    newOccupancy: number,
  ): Promise<void> {
    try {
      // Hole aktuelle Belegungsdaten
      const occupancyStatus = await this.getCurrentOccupancyStatus(roomId);

      // Hole die maximale Kapazität des Raums aus der Datenbank
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
        select: { maxCapacity: true },
      });

      if (occupancyStatus && this.eventsGateway && room) {
        this.logger.verbose(
          `Sende Belegungs-Update via WebSocket für Raum ${roomId}: ${newOccupancy} (maxCapacity: ${room.maxCapacity})`,
        );
        // Sende occupancyStatus und maxCapacity an das Gateway
        this.eventsGateway.sendOccupancyUpdate(occupancyStatus);
      }
    } catch (error) {
      this.logger.error(
        `Fehler beim Senden des Belegungs-Updates via WebSocket für Raum ${roomId}. ` +
          `Fehler: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * @private
   * @method sendRoomStatusUpdate
   * @description Sendet ein WebSocket-Update über die Raum-Status-Änderung (offen/geschlossen) 
   * an alle verbundenen Clients.
   *
   * @param {string} roomId - Die ID des Raums
   * @param {boolean} isOpen - Der neue Öffnungsstatus des Raums
   */
  private async sendRoomStatusUpdate(
    roomId: string,
    isOpen: boolean,
  ): Promise<void> {
    try {
      // Hole aktuelle Raumdaten
      const room = await this.prisma.room.findFirst();
      
      if (!room) {
        this.logger.error(`Room with ID ${roomId} not found`);
        return;
      }

      // Berechne den Belegungsgrad in Prozent
      const percentageFull =
        room.maxCapacity > 0
          ? Math.round((room.capacity / room.maxCapacity) * 100)
          : 0;

      const occupancyStatus: OccupancyStatusDto = {
        currentOccupancy: room.capacity,
        totalCapacity: room.maxCapacity,
        timestamp: new Date(),
        percentageFull,
      };

      if (room && this.eventsGateway) {
        this.logger.verbose(
          `Sende Raum-Status-Update via WebSocket für Raum ${roomId}: isOpen = ${isOpen}`,
        );

        if (occupancyStatus) {
          this.eventsGateway.sendOccupancyUpdate(occupancyStatus); 
        }
      }
    } catch (error) {
      this.logger.error(
        `Fehler beim Senden des Raum-Status-Updates via WebSocket für Raum ${roomId}. ` +
          `Fehler: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

}

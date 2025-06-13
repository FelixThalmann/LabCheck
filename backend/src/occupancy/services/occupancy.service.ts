/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PassageDirection } from '@prisma/client';
import { EventsGateway } from '../../events/events/events.gateway';
import { OccupancyStatusModel } from '../../door/models/occupancy-status.model';

/**
 * @class OccupancyService
 * @description Service für die Verwaltung der Raumbelegung basierend auf Sensor-Events.
 * Verwaltet die automatische Aktualisierung der aktuellen Belegung (capacity)
 * in der Room-Tabelle basierend auf eingehenden PassageEvents.
 */
@Injectable()
export class OccupancyService {
  private readonly logger = new Logger(OccupancyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway?: EventsGateway, // Optional für WebSocket-Updates
  ) {}

  /**
   * @method updateRoomOccupancy
   * @description Aktualisiert die Raumbelegung basierend auf einem Passage-Event.
   * Verwendet Transaktionen für atomare Operationen und verhindert Race Conditions.
   *
   * Technischer Ablauf:
   * 1. Sensor mit zugehörigem Raum laden
   * 2. Aktuelle Raumbelegung in einer Transaktion lesen und aktualisieren
   * 3. Validierung: Belegung darf nicht negativ oder über maxCapacity sein
   * 4. WebSocket-Update an alle verbundenen Clients senden
   *
   * @param {string} sensorId - Die Datenbank-ID des Sensors
   * @param {PassageDirection} direction - Die Richtung des Passage-Events (IN oder OUT)
   * @param {Date} eventTimestamp - Zeitstempel des Events für Logging
   * @returns {Promise<{ newOccupancy: number; roomId: string } | null>} Neue Belegung und Raum-ID oder null bei Fehlern
   */
  async     updateRoomOccupancy(
    sensorId: string,
    direction: PassageDirection,
  ): Promise<{ newOccupancy: number; roomId: string } | null> {
    this.logger.verbose(
      `Updating room occupancy for sensor ${sensorId}, direction: ${direction}`,
    );

    try {
      // Verwende eine Prisma-Transaktion für atomare Operationen
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Sensor mit zugehörigem Raum laden
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

        // 2. Aktuelle Raumbelegung berechnen
        const capacityChange = direction === PassageDirection.IN ? 1 : -1;
        const currentCapacity = sensor.room.capacity;
        const maxCapacity = sensor.room.maxCapacity;
        const newCapacity = currentCapacity + capacityChange;

        // 3. Validierung der neuen Belegung
        if (newCapacity < 0) {
          this.logger.warn(
            `Attempted to set negative occupancy for room ${sensor.room.name} (ID: ${sensor.room.id}). ` +
              `Current: ${currentCapacity}, Change: ${capacityChange}. Setting to 0 instead.`,
          );
          // Setze auf 0 statt negativen Wert
          await tx.room.update({
            where: { id: sensor.room.id },
            data: {
              capacity: 0,
              updatedAt: new Date(),
            },
          });
          return { newOccupancy: 0, roomId: sensor.room.id };
        }

        if (newCapacity > maxCapacity) {
          this.logger.warn(
            `Attempted to exceed maximum capacity for room ${sensor.room.name} (ID: ${sensor.room.id}). ` +
              `New: ${newCapacity}, Max: ${maxCapacity}. Setting to maximum instead.`,
          );
          // Setze auf maximale Kapazität
          await tx.room.update({
            where: { id: sensor.room.id },
            data: {
              capacity: maxCapacity,
              updatedAt: new Date(),
            },
          });
          return { newOccupancy: maxCapacity, roomId: sensor.room.id };
        }

        // 4. Normale Aktualisierung der Belegung
        await tx.room.update({
          where: { id: sensor.room.id },
          data: {
            capacity: newCapacity,
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          `Successfully updated occupancy for room ${sensor.room.name} (ID: ${sensor.room.id}): ` +
            `${currentCapacity} → ${newCapacity} (${direction === PassageDirection.IN ? '+1' : '-1'})`,
        );

        return { newOccupancy: newCapacity, roomId: sensor.room.id };
      });

      // 5. WebSocket-Update senden (außerhalb der Transaktion)
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
   * @description Holt den aktuellen Belegungsstatus für einen Raum und formatiert ihn als OccupancyStatusModel.
   *
   * @param {string} roomId - Die ID des Raums
   * @returns {Promise<OccupancyStatusModel | null>} Aktueller Belegungsstatus oder null bei Fehlern
   */
  async getCurrentOccupancyStatus(
    roomId: string,
  ): Promise<OccupancyStatusModel | null> {
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

      const occupancyStatus: OccupancyStatusModel = {
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
   * @method resetRoomOccupancy
   * @description Setzt die Belegung eines Raums auf einen bestimmten Wert zurück.
   * Nützlich für manuelle Korrekturen oder automatische Resets (z.B. nachts).
   *
   * @param {string} roomId - Die ID des Raums
   * @param {number} newOccupancy - Die neue Belegung (default: 0)
   * @returns {Promise<boolean>} True bei Erfolg, false bei Fehlern
   */
  async resetRoomOccupancy(
    roomId: string,
    newOccupancy: number = 0,
  ): Promise<boolean> {
    this.logger.log(
      `Resetting occupancy for room ${roomId} to ${newOccupancy}`,
    );

    try {
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        throw new BadRequestException(`Room with ID ${roomId} not found`);
      }

      // Validierung der neuen Belegung
      if (newOccupancy < 0 || newOccupancy > room.maxCapacity) {
        throw new BadRequestException(
          `Invalid occupancy value ${newOccupancy}. Must be between 0 and ${room.maxCapacity}`,
        );
      }

      await this.prisma.room.update({
        where: { id: roomId },
        data: {
          capacity: newOccupancy,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Successfully reset occupancy for room ${room.name} to ${newOccupancy}`,
      );

      // WebSocket-Update senden
      if (this.eventsGateway) {
        await this.sendOccupancyUpdate(roomId, newOccupancy);
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to reset occupancy for room ${roomId} to ${newOccupancy}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
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
        this.eventsGateway.sendOccupancyUpdate(occupancyStatus, room.maxCapacity);
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
   * @method getOccupancyStatistics
   * @description Liefert Statistiken über die Raumbelegung für Analytics/Monitoring.
   *
   * @param {string} roomId - Die ID des Raums
   * @param {Date} from - Startdatum für Statistiken
   * @param {Date} to - Enddatum für Statistiken
   * @returns {Promise<any>} Belegungsstatistiken
   */
  async getOccupancyStatistics(
    roomId: string,
    from: Date,
    to: Date,
  ): Promise<{
    averageOccupancy: number;
    maxOccupancy: number;
    totalPassageEvents: number;
    inEvents: number;
    outEvents: number;
  } | null> {
    try {
      // Hole alle Passage-Events für den Zeitraum der Sensoren des Raums
      const passageEvents = await this.prisma.passageEvent.findMany({
        where: {
          sensor: {
            roomId: roomId,
          },
          eventTimestamp: {
            gte: from,
            lte: to,
          },
        },
        orderBy: {
          eventTimestamp: 'asc',
        },
      });

      const totalPassageEvents = passageEvents.length;
      const inEvents = passageEvents.filter(
        (e) => e.direction === PassageDirection.IN,
      ).length;
      const outEvents = passageEvents.filter(
        (e) => e.direction === PassageDirection.OUT,
      ).length;

      // Hole aktuelle Raumdaten
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) return null;

      // Berechne Durchschnittsbelegung (vereinfacht)
      const currentOccupancy = room.capacity;
      const maxCapacity = room.maxCapacity;

      return {
        averageOccupancy: currentOccupancy, // Vereinfacht - könnte komplexer berechnet werden
        maxOccupancy: maxCapacity,
        totalPassageEvents,
        inEvents,
        outEvents,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get occupancy statistics for room ${roomId}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }
}

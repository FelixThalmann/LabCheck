import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { OccupancyStatusModel, DoorStatusModel, DoorEventModel, PassageEventModel, MotionEventModel } from '../models';
import { LabSettingsService } from '../../lab-settings/lab-settings.service';
import { PassageDirection } from '@prisma/client';

@Injectable()
export class DoorService {
  private readonly logger = new Logger(DoorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly labSettingsService: LabSettingsService,
  ) {}

  /**
   * Ruft den aktuellsten Türstatus ab
   * @param sensorId Optional: Beschränkt die Abfrage auf einen bestimmten Sensor
   * @returns Das neueste DoorEvent als DoorStatusModel
   */
  async getLatestDoorStatus(sensorId?: string): Promise<DoorStatusModel> {
    this.logger.debug(`Getting latest door status ${sensorId ? `for sensor ${sensorId}` : ''}`);
    
    const whereClause = sensorId ? { sensorId } : {};
    
    const latestDoorEvent = await this.prisma.doorEvent.findFirst({
      where: whereClause,
      orderBy: {
        eventTimestamp: 'desc',
      },
    });

    if (!latestDoorEvent) {
      throw new NotFoundException('No door events found');
    }

    return {
      id: latestDoorEvent.id.toString(),
      isOpen: latestDoorEvent.doorIsOpen,
      timestamp: latestDoorEvent.eventTimestamp,
      sensorId: latestDoorEvent.sensorId,
    };
  }

  /**
   * Berechnet die aktuelle Belegung basierend auf PassageEvents
   * @param sensorId Optional: Beschränkt die Berechnung auf einen bestimmten Sensor
   * @returns Ein OccupancyStatusModel mit aktueller Belegung und Kapazität
   */
  async getCurrentOccupancy(sensorId?: string): Promise<OccupancyStatusModel> {
    this.logger.debug(`Calculating current occupancy ${sensorId ? `for sensor ${sensorId}` : ''}`);
    
    const whereClause = sensorId ? { sensorId } : {};
    
    // Alle Passagen abrufen
    const passages = await this.prisma.passageEvent.findMany({
      where: whereClause,
      orderBy: {
        eventTimestamp: 'asc',
      },
    });

    // Aktuelle Belegung berechnen
    let currentOccupancy = 0;
    let lastTimestamp = new Date(0); // Standardwert, falls keine Passages gefunden

    for (const passage of passages) {
      if (passage.direction === PassageDirection.IN) {
        currentOccupancy++;
      } else if (passage.direction === PassageDirection.OUT) {
        currentOccupancy = Math.max(0, currentOccupancy - 1); // Verhindern von negativen Werten
      }
      
      lastTimestamp = passage.eventTimestamp;
    }

    // Max. Kapazität aus den Einstellungen abrufen
    const totalCapacity = await this.labSettingsService.getLabCapacity();
    
    // Prozent berechnen
    const percentageFull = totalCapacity > 0 
      ? Math.round((currentOccupancy / totalCapacity) * 100) 
      : 0;

    return {
      currentOccupancy,
      totalCapacity,
      timestamp: lastTimestamp,
      percentageFull,
    };
  }

  /**
   * Ruft Türereignisse aus einem bestimmten Zeitraum ab
   * @param options Filter- und Paginierungsoptionen
   * @returns Liste von Türereignissen
   */
  async getDoorEvents(options: {
    from?: Date;
    to?: Date;
    sensorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<DoorEventModel[]> {
    const { from, to, sensorId, limit = 100, offset = 0 } = options;
    
    const whereClause: any = {};
    
    if (sensorId) {
      whereClause.sensorId = sensorId;
    }
    
    if (from || to) {
      whereClause.eventTimestamp = {};
      if (from) whereClause.eventTimestamp.gte = from;
      if (to) whereClause.eventTimestamp.lte = to;
    }
    
    const doorEvents = await this.prisma.doorEvent.findMany({
      where: whereClause,
      orderBy: {
        eventTimestamp: 'desc',
      },
      take: limit,
      skip: offset,
    });
    
    return doorEvents.map(event => ({
      id: event.id.toString(),
      doorIsOpen: event.doorIsOpen,
      eventTimestamp: event.eventTimestamp,
      sensorId: event.sensorId,
    }));
  }

  /**
   * Ruft Durchgangsereignisse aus einem bestimmten Zeitraum ab
   * @param options Filter- und Paginierungsoptionen
   * @returns Liste von Durchgangsereignissen
   */
  async getPassageEvents(options: {
    from?: Date;
    to?: Date;
    sensorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PassageEventModel[]> {
    const { from, to, sensorId, limit = 100, offset = 0 } = options;
    
    const whereClause: any = {};
    
    if (sensorId) {
      whereClause.sensorId = sensorId;
    }
    
    if (from || to) {
      whereClause.eventTimestamp = {};
      if (from) whereClause.eventTimestamp.gte = from;
      if (to) whereClause.eventTimestamp.lte = to;
    }
    
    const passageEvents = await this.prisma.passageEvent.findMany({
      where: whereClause,
      orderBy: {
        eventTimestamp: 'desc',
      },
      take: limit,
      skip: offset,
    });
    
    return passageEvents.map(event => ({
      id: event.id.toString(),
      direction: event.direction,
      eventTimestamp: event.eventTimestamp,
      sensorId: event.sensorId,
    }));
  }

  /**
   * Ruft Bewegungsereignisse aus einem bestimmten Zeitraum ab
   * @param options Filter- und Paginierungsoptionen
   * @returns Liste von Bewegungsereignissen
   */
  async getMotionEvents(options: {
    from?: Date;
    to?: Date;
    sensorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<MotionEventModel[]> {
    const { from, to, sensorId, limit = 100, offset = 0 } = options;
    
    const whereClause: any = {};
    
    if (sensorId) {
      whereClause.sensorId = sensorId;
    }
    
    if (from || to) {
      whereClause.eventTimestamp = {};
      if (from) whereClause.eventTimestamp.gte = from;
      if (to) whereClause.eventTimestamp.lte = to;
    }
    
    const motionEvents = await this.prisma.motionEvent.findMany({
      where: whereClause,
      orderBy: {
        eventTimestamp: 'desc',
      },
      take: limit,
      skip: offset,
    });
    
    return motionEvents.map(event => ({
      id: event.id.toString(),
      motionDetected: event.motionDetected,
      eventTimestamp: event.eventTimestamp,
      sensorId: event.sensorId,
    }));
  }
}

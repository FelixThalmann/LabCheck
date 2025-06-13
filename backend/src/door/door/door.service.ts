import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  OccupancyStatusModel,
  DoorStatusModel,
  DoorEventModel,
  PassageEventModel,
  MotionEventModel,
} from '../models';
import { LabSettingsService } from '../../lab-settings/lab-settings.service';
import { PassageDirection, Prisma } from '@prisma/client';

@Injectable()
export class DoorService {
  private readonly logger = new Logger(DoorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly labSettingsService: LabSettingsService,
  ) {}

  /**
   * Holt den aktuellsten Türstatus.
   * Gibt nur das Attribut "isOpen" zurück (alle anderen werden ausgelassen).
   * @returns Promise<Pick<DoorStatusModel, 'isOpen'>>
   * @throws NotFoundException, wenn kein Tür-Event gefunden wurde.
   */
  async getLatestDoorStatus(): Promise<Pick<DoorStatusModel, 'isOpen'>> {
    const latest = await this.prisma.doorEvent.findFirst({
      orderBy: { eventTimestamp: 'desc' },
    });

    if (!latest) {
      throw new NotFoundException('Kein Tür-Event gefunden');
    }

    
    return {
      isOpen: latest.doorIsOpen,
    };
  }

  /**
   * Retrieves door events within a specified time range and with optional filters.
   * @param options An object containing filter and pagination options:
   *                `from` (Date, optional): Start date of the time range.
   *                `to` (Date, optional): End date of the time range.
   *                `sensorId` (string, optional): Filter by a specific sensor ID.
   *                `limit` (number, optional): Maximum number of events to return (default: 100).
   *                `offset` (number, optional): Number of events to skip (for pagination, default: 0).
   * @returns A Promise resolving to a list of DoorEventModel.
   */
  async getDoorEvents(options: {
    from?: Date;
    to?: Date;
    sensorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<DoorEventModel[]> {
    // Destructure options with default values for limit and offset.
    const { from, to, sensorId, limit = 100, offset = 0 } = options;

    // Initialize the where clause for the Prisma query.
    const whereClause: Prisma.DoorEventWhereInput = {};

    // Add sensorId to the where clause if provided.
    if (sensorId) {
      whereClause.sensorId = sensorId;
    }

    // Add time range (from/to) to the where clause if provided.
    if (from || to) {
      whereClause.eventTimestamp = {};
      if (from) {
        whereClause.eventTimestamp.gte = from; // Greater than or equal to 'from' date.
      }
      if (to) {
        whereClause.eventTimestamp.lte = to; // Less than or equal to 'to' date.
      }
    }

    // Fetch door events from the database based on the constructed where clause and pagination options.
    const doorEvents = await this.prisma.doorEvent.findMany({
      where: whereClause,
      orderBy: {
        eventTimestamp: 'desc', // Order by timestamp in descending order.
      },
      take: limit, // Apply limit for pagination.
      skip: offset, // Apply offset for pagination.
    });

    // Map the Prisma DoorEvent entities to DoorEventModel.
    return doorEvents.map((event) => ({
      id: event.id.toString(),
      doorIsOpen: event.doorIsOpen,
      eventTimestamp: event.eventTimestamp,
      sensorId: event.sensorId,
    }));
  }

  /**
   * Retrieves passage events within a specified time range and with optional filters.
   * @param options An object containing filter and pagination options:
   *                `from` (Date, optional): Start date of the time range.
   *                `to` (Date, optional): End date of the time range.
   *                `sensorId` (string, optional): Filter by a specific sensor ID.
   *                `limit` (number, optional): Maximum number of events to return (default: 100).
   *                `offset` (number, optional): Number of events to skip (for pagination, default: 0).
   * @returns A Promise resolving to a list of PassageEventModel.
   */
  async getPassageEvents(options: {
    from?: Date;
    to?: Date;
    sensorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PassageEventModel[]> {
    // Destructure options with default values for limit and offset.
    const { from, to, sensorId, limit = 100, offset = 0 } = options;

    // Initialize the where clause for the Prisma query.
    const whereClause: Prisma.PassageEventWhereInput = {};

    // Add sensorId to the where clause if provided.
    if (sensorId) {
      whereClause.sensorId = sensorId;
    }

    // Add time range (from/to) to the where clause if provided.
    if (from || to) {
      whereClause.eventTimestamp = {};
      if (from) {
        whereClause.eventTimestamp.gte = from; // Greater than or equal to 'from' date.
      }
      if (to) {
        whereClause.eventTimestamp.lte = to; // Less than or equal to 'to' date.
      }
    }

    // Fetch passage events from the database based on the constructed where clause and pagination options.
    const passageEvents = await this.prisma.passageEvent.findMany({
      where: whereClause,
      orderBy: {
        eventTimestamp: 'desc', // Order by timestamp in descending order.
      },
      take: limit, // Apply limit for pagination.
      skip: offset, // Apply offset for pagination.
    });

    // Map the Prisma PassageEvent entities to PassageEventModel.
    return passageEvents.map((event) => ({
      id: event.id.toString(),
      direction: event.direction,
      eventTimestamp: event.eventTimestamp,
      sensorId: event.sensorId,
    }));
  }

  /**
   * Retrieves motion events within a specified time range and with optional filters.
   * @param options An object containing filter and pagination options:
   *                `from` (Date, optional): Start date of the time range.
   *                `to` (Date, optional): End date of the time range.
   *                `sensorId` (string, optional): Filter by a specific sensor ID.
   *                `limit` (number, optional): Maximum number of events to return (default: 100).
   *                `offset` (number, optional): Number of events to skip (for pagination, default: 0).
   * @returns A Promise resolving to a list of MotionEventModel.
   */
  async getMotionEvents(options: {
    from?: Date;
    to?: Date;
    sensorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<MotionEventModel[]> {
    // Destructure options with default values for limit and offset.
    const { from, to, sensorId, limit = 100, offset = 0 } = options;

    // Initialize the where clause for the Prisma query.
    const whereClause: Prisma.MotionEventWhereInput = {};

    // Add sensorId to the where clause if provided.
    if (sensorId) {
      whereClause.sensorId = sensorId;
    }

    // Add time range (from/to) to the where clause if provided.
    if (from || to) {
      whereClause.eventTimestamp = {};
      if (from) {
        whereClause.eventTimestamp.gte = from; // Greater than or equal to 'from' date.
      }
      if (to) {
        whereClause.eventTimestamp.lte = to; // Less than or equal to 'to' date.
      }
    }

    // Fetch motion events from the database based on the constructed where clause and pagination options.
    const motionEvents = await this.prisma.motionEvent.findMany({
      where: whereClause,
      orderBy: {
        eventTimestamp: 'desc', // Order by timestamp in descending order.
      },
      take: limit, // Apply limit for pagination.
      skip: offset, // Apply offset for pagination.
    });

    // Map the Prisma MotionEvent entities to MotionEventModel.
    return motionEvents.map((event) => ({
      id: event.id.toString(),
      motionDetected: event.motionDetected,
      eventTimestamp: event.eventTimestamp,
      sensorId: event.sensorId,
    }));
  }
}

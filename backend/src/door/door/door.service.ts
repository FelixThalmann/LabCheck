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
   * Retrieves the most recent door status.
   * @param sensorId Optional: Restricts the query to a specific sensor.
   * @returns A Promise resolving to the latest DoorEvent as a DoorStatusModel.
   * @throws NotFoundException if no door events are found.
   */
  async getLatestDoorStatus(): Promise<DoorStatusModel> {
    this.logger.debug(
      `Getting latest door status`,
    );

    // Prepare the where clause for the Prisma query.
    // If a sensorId is provided, filter by it. Otherwise, the clause is empty.
    const whereClause: Prisma.DoorEventWhereInput = {};

    // Fetch the first (most recent) door event matching the criteria.
    const latestDoorEvent = await this.prisma.doorEvent.findFirst({
      where: whereClause,
      orderBy: {
        eventTimestamp: 'desc', // Order by timestamp in descending order to get the latest.
      },
    });

    // If no event is found, throw an exception.
    if (!latestDoorEvent) {
      throw new NotFoundException('No door events found');
    }

    // Map the Prisma DoorEvent entity to the DoorStatusModel.
    return {
      id: latestDoorEvent.id.toString(),
      isOpen: latestDoorEvent.doorIsOpen,
      timestamp: latestDoorEvent.eventTimestamp,
      sensorId: latestDoorEvent.sensorId,
    };
  }

  /**
   * Calculates the current occupancy based on PassageEvents.
   * @param sensorId Optional: Restricts the calculation to a specific sensor.
   * @returns A Promise resolving to an OccupancyStatusModel with current occupancy, total capacity, timestamp of the last event, and percentage full.
   */
  async getCurrentOccupancy(
    sensorId?: string,
  ): Promise<OccupancyStatusModel> {
    this.logger.debug(
      `Calculating current occupancy ${
        sensorId ? `for sensor ${sensorId}` : ''
      }`,
    );

    // Prepare the where clause for filtering passage events by sensorId if provided.
    const whereClause: Prisma.PassageEventWhereInput = sensorId
      ? { sensorId }
      : {};

    // Retrieve all passage events, ordered by timestamp to correctly calculate occupancy.
    const passages = await this.prisma.passageEvent.findMany({
      where: whereClause,
      orderBy: {
        eventTimestamp: 'asc', // Order by timestamp in ascending order for chronological processing.
      },
    });

    // Calculate current occupancy by iterating through passage events.
    let currentOccupancy = 0;
    let lastTimestamp = new Date(0); // Initialize with a very old date; will be updated if passages exist.

    for (const passage of passages) {
      if (passage.direction === PassageDirection.IN) {
        currentOccupancy++; // Increment for an 'IN' passage.
      } else if (passage.direction === PassageDirection.OUT) {
        currentOccupancy = Math.max(0, currentOccupancy - 1); // Decrement for an 'OUT' passage, ensuring it doesn't go below zero.
      }
      lastTimestamp = passage.eventTimestamp; // Update the timestamp to the latest event processed.
    }

    // Retrieve the maximum capacity from lab settings.
    const totalCapacity = await this.labSettingsService.getLabCapacity();

    // Calculate the percentage of occupancy.
    const percentageFull =
      totalCapacity > 0
        ? Math.round((currentOccupancy / totalCapacity) * 100) // Calculate percentage if capacity is greater than 0.
        : 0; // Default to 0% if capacity is 0 or less to avoid division by zero.

    return {
      currentOccupancy,
      totalCapacity,
      timestamp: lastTimestamp, // Timestamp of the last passage event considered.
      percentageFull,
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

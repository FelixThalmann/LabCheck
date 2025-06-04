import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { DoorService } from './door.service';
import {
  DoorStatusModel,
  OccupancyStatusModel,
  DoorEventModel,
  PassageEventModel,
  MotionEventModel,
} from '../models';
import { Logger } from '@nestjs/common';

/**
 * @class DoorResolver
 * @description Resolver for handling GraphQL queries related to door and occupancy data.
 * It uses {@link DoorService} to interact with the data layer.
 * The `@Resolver()` decorator marks this class as a GraphQL resolver,
 * making it discoverable by NestJS's GraphQL module.
 */
@Resolver()
export class DoorResolver {
  /**
   * @private
   * @readonly
   * @type {Logger}
   * @description Logger instance for this resolver, used for logging messages.
   */
  private readonly logger = new Logger(DoorResolver.name);

  /**
   * @constructor
   * @param {DoorService} doorService - The service responsible for door and occupancy logic.
   * This constructor uses NestJS's dependency injection to inject an instance of `DoorService`.
   * The `doorService` will be used by the resolver methods to fetch or process data.
   */
  constructor(private readonly doorService: DoorService) {}

  /**
   * @async
   * @method getLatestDoorStatus
   * @description GraphQL query to retrieve the most recent status of a door (open/closed).
   * @param {string} [sensorId] - Optional ID of the specific sensor to query. If not provided, returns status for any sensor.
   * @returns {Promise<DoorStatusModel>} A promise that resolves to the latest door status.
   *
   * The `@Query()` decorator exposes this method as a GraphQL query.
   * - `() => DoorStatusModel`: Specifies that this query returns a `DoorStatusModel` object.
   * - `name: 'latestDoorStatus'`: Defines the name of this query in the GraphQL schema.
   * - `description`: Provides a human-readable description for the schema.
   */
  @Query(() => DoorStatusModel, {
    name: 'latestDoorStatus',
    description: 'Get the latest door status',
  })
  async getLatestDoorStatus(
    /**
     * The `@Args()` decorator defines an argument for this GraphQL query.
     * - `'sensorId'`: The name of the argument in the GraphQL schema.
     * - `{ type: () => String, nullable: true }`: Specifies the argument is a String and can be null.
     */
    @Args('sensorId', { type: () => String, nullable: true }) sensorId?: string,
  ): Promise<DoorStatusModel> {
    this.logger.debug(
      `GraphQL Query: getLatestDoorStatus - sensorId: ${sensorId || 'all'}`,
    );
    // Delegates the business logic to the `DoorService`.
    return this.doorService.getLatestDoorStatus();
  }

  /**
   * @async
   * @method getCurrentOccupancy
   * @description GraphQL query to retrieve the current occupancy status of the lab.
   * @param {string} [sensorId] - Optional ID of the specific sensor to query.
   * @returns {Promise<OccupancyStatusModel>} A promise that resolves to the current occupancy status.
   */
  @Query(() => OccupancyStatusModel, {
    name: 'currentOccupancy',
    description: 'Get the current occupancy status',
  })
  async getCurrentOccupancy(
    @Args('sensorId', { type: () => String, nullable: true }) sensorId?: string,
  ): Promise<OccupancyStatusModel> {
    this.logger.debug(
      `GraphQL Query: getCurrentOccupancy - sensorId: ${sensorId || 'all'}`,
    );
    // Delegates the business logic to the `DoorService`.
    return this.doorService.getCurrentOccupancy(sensorId);
  }

  /**
   * @async
   * @method getDoorEvents
   * @description GraphQL query to retrieve a list of door events within a specified time range.
   * @param {string} [from] - Optional start of the time range (ISO 8601 date string).
   * @param {string} [to] - Optional end of the time range (ISO 8601 date string).
   * @param {string} [sensorId] - Optional ID of the specific sensor to filter events by.
   * @param {number} [limit=100] - Optional limit on the number of events to return.
   * @param {number} [offset=0] - Optional offset for pagination.
   * @returns {Promise<DoorEventModel[]>} A promise that resolves to an array of door events.
   *
   * This query demonstrates handling multiple optional arguments, including pagination (`limit`, `offset`)
   * and date range filtering (`from`, `to`).
   */
  @Query(() => [DoorEventModel], {
    name: 'doorEvents',
    description: 'Get door events within a time range',
  })
  async getDoorEvents(
    @Args('from', { type: () => String, nullable: true }) from?: string,
    @Args('to', { type: () => String, nullable: true }) to?: string,
    @Args('sensorId', { type: () => String, nullable: true }) sensorId?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 })
    limit?: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset?: number,
  ): Promise<DoorEventModel[]> {
    this.logger.debug(
      `GraphQL Query: getDoorEvents - from: ${from}, to: ${to}, sensorId: ${
        sensorId || 'all'
      }, limit: ${limit}, offset: ${offset}`,
    );

    // The input `from` and `to` are ISO date strings. They are converted to Date objects
    // before being passed to the service. If they are not provided, `undefined` is passed.
    return this.doorService.getDoorEvents({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      sensorId,
      limit,
      offset,
    });
  }

  /**
   * @async
   * @method getPassageEvents
   * @description GraphQL query to retrieve a list of passage events within a specified time range.
   * @param {string} [from] - Optional start of the time range (ISO 8601 date string).
   * @param {string} [to] - Optional end of the time range (ISO 8601 date string).
   * @param {string} [sensorId] - Optional ID of the specific sensor to filter events by.
   * @param {number} [limit=100] - Optional limit on the number of events to return.
   * @param {number} [offset=0] - Optional offset for pagination.
   * @returns {Promise<PassageEventModel[]>} A promise that resolves to an array of passage events.
   */
  @Query(() => [PassageEventModel], {
    name: 'passageEvents',
    description: 'Get passage events within a time range',
  })
  async getPassageEvents(
    @Args('from', { type: () => String, nullable: true }) from?: string,
    @Args('to', { type: () => String, nullable: true }) to?: string,
    @Args('sensorId', { type: () => String, nullable: true }) sensorId?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 })
    limit?: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset?: number,
  ): Promise<PassageEventModel[]> {
    this.logger.debug(
      `GraphQL Query: getPassageEvents - from: ${from}, to: ${to}, sensorId: ${
        sensorId || 'all'
      }, limit: ${limit}, offset: ${offset}`,
    );

    // Similar to getDoorEvents, date strings are converted to Date objects.
    return this.doorService.getPassageEvents({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      sensorId,
      limit,
      offset,
    });
  }

  /**
   * @async
   * @method getMotionEvents
   * @description GraphQL query to retrieve a list of motion detection events within a specified time range.
   * @param {string} [from] - Optional start of the time range (ISO 8601 date string).
   * @param {string} [to] - Optional end of the time range (ISO 8601 date string).
   * @param {string} [sensorId] - Optional ID of the specific sensor to filter events by.
   * @param {number} [limit=100] - Optional limit on the number of events to return.
   * @param {number} [offset=0] - Optional offset for pagination.
   * @returns {Promise<MotionEventModel[]>} A promise that resolves to an array of motion events.
   */
  @Query(() => [MotionEventModel], {
    name: 'motionEvents',
    description: 'Get motion events within a time range',
  })
  async getMotionEvents(
    @Args('from', { type: () => String, nullable: true }) from?: string,
    @Args('to', { type: () => String, nullable: true }) to?: string,
    @Args('sensorId', { type: () => String, nullable: true }) sensorId?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 })
    limit?: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset?: number,
  ): Promise<MotionEventModel[]> {
    this.logger.debug(
      `GraphQL Query: getMotionEvents - from: ${from}, to: ${to}, sensorId: ${
        sensorId || 'all'
      }, limit: ${limit}, offset: ${offset}`,
    );

    // Date string conversion and delegation to the service layer.
    return this.doorService.getMotionEvents({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      sensorId,
      limit,
      offset,
    });
  }
}

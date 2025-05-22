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

@Resolver()
export class DoorResolver {
  private readonly logger = new Logger(DoorResolver.name);

  constructor(private readonly doorService: DoorService) {}

  @Query(() => DoorStatusModel, {
    name: 'latestDoorStatus',
    description: 'Get the latest door status',
  })
  async getLatestDoorStatus(
    @Args('sensorId', { type: () => String, nullable: true }) sensorId?: string,
  ): Promise<DoorStatusModel> {
    this.logger.debug(`GraphQL Query: getLatestDoorStatus - sensorId: ${sensorId || 'all'}`);
    return this.doorService.getLatestDoorStatus(sensorId);
  }

  @Query(() => OccupancyStatusModel, {
    name: 'currentOccupancy',
    description: 'Get the current occupancy status',
  })
  async getCurrentOccupancy(
    @Args('sensorId', { type: () => String, nullable: true }) sensorId?: string,
  ): Promise<OccupancyStatusModel> {
    this.logger.debug(`GraphQL Query: getCurrentOccupancy - sensorId: ${sensorId || 'all'}`);
    return this.doorService.getCurrentOccupancy(sensorId);
  }

  @Query(() => [DoorEventModel], {
    name: 'doorEvents',
    description: 'Get door events within a time range',
  })
  async getDoorEvents(
    @Args('from', { type: () => String, nullable: true }) from?: string,
    @Args('to', { type: () => String, nullable: true }) to?: string,
    @Args('sensorId', { type: () => String, nullable: true }) sensorId?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset?: number,
  ): Promise<DoorEventModel[]> {
    this.logger.debug(
      `GraphQL Query: getDoorEvents - from: ${from}, to: ${to}, sensorId: ${
        sensorId || 'all'
      }, limit: ${limit}, offset: ${offset}`,
    );

    return this.doorService.getDoorEvents({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      sensorId,
      limit,
      offset,
    });
  }

  @Query(() => [PassageEventModel], {
    name: 'passageEvents',
    description: 'Get passage events within a time range',
  })
  async getPassageEvents(
    @Args('from', { type: () => String, nullable: true }) from?: string,
    @Args('to', { type: () => String, nullable: true }) to?: string,
    @Args('sensorId', { type: () => String, nullable: true }) sensorId?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset?: number,
  ): Promise<PassageEventModel[]> {
    this.logger.debug(
      `GraphQL Query: getPassageEvents - from: ${from}, to: ${to}, sensorId: ${
        sensorId || 'all'
      }, limit: ${limit}, offset: ${offset}`,
    );

    return this.doorService.getPassageEvents({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      sensorId,
      limit,
      offset,
    });
  }

  @Query(() => [MotionEventModel], {
    name: 'motionEvents',
    description: 'Get motion events within a time range',
  })
  async getMotionEvents(
    @Args('from', { type: () => String, nullable: true }) from?: string,
    @Args('to', { type: () => String, nullable: true }) to?: string,
    @Args('sensorId', { type: () => String, nullable: true }) sensorId?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset?: number,
  ): Promise<MotionEventModel[]> {
    this.logger.debug(
      `GraphQL Query: getMotionEvents - from: ${from}, to: ${to}, sensorId: ${
        sensorId || 'all'
      }, limit: ${limit}, offset: ${offset}`,
    );

    return this.doorService.getMotionEvents({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      sensorId,
      limit,
      offset,
    });
  }
}

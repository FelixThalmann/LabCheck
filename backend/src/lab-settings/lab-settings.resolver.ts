/* eslint-disable prettier/prettier */
// NestJS GraphQL decorators for defining resolvers, queries, mutations, and arguments.
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
// Service class containing business logic for lab settings.
import { LabSettingsService } from './lab-settings.service';
// GraphQL model representing a lab setting, used for defining return types in the schema.
import { LabSettingModel } from './graphql/lab-setting.model';
// Data Transfer Object (DTO) for encapsulating the input arguments for the setLabCapacity mutation.
import { SetCapacityInput } from './dto/set-capacity.input';
// NestJS Logger for structured, context-aware application logging.
import { Logger } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { GqlCurrentUser } from '../auth/decorators/gql-current-user.decorator';
import { User as UserModelPrisma } from '@prisma/client';

/**
 * @class LabSettingsResolver
 * @description Resolver for handling GraphQL queries and mutations related to lab settings.
 * It uses {@link LabSettingsService} to interact with the data layer and business logic.
 * The `@Resolver()` decorator marks this class as a GraphQL resolver, making it
 * discoverable by NestJS's GraphQL module to build the executable schema.
 * It implicitly defaults to operating on the `LabSettingModel` if not specified,
 * but specific query/mutation return types are explicitly defined.
 */
@Resolver()
export class LabSettingsResolver {
  /**
   * @private
   * @readonly
   * @type {Logger}
   * @description Logger instance for this resolver, used for logging messages.
   * The logger is initialized with the resolver's class name for context in logs.
   */
  private readonly logger = new Logger(LabSettingsResolver.name);

  /**
   * @constructor
   * @param {LabSettingsService} labSettingsService - The service responsible for lab settings business logic.
   * @description Injects an instance of {@link LabSettingsService} using NestJS's dependency injection system.
   * This service will be used by the resolver methods to interact with the data layer and perform business logic operations.
   * `private readonly` ensures `labSettingsService` is an immutable private property.
   */
  constructor(private readonly labSettingsService: LabSettingsService) {}

  @Public()
  @Query(() => Int, {
    name: 'labCapacity',
    description: 'Get the total capacity of the lab',
  })
  async getLabCapacity(): Promise<number> {
    this.logger.debug('GraphQL Query: getLabCapacity (public)');
    return this.labSettingsService.getLabCapacity();
  }

  @Mutation(() => LabSettingModel, {
    name: 'setLabCapacity',
    description: 'Set the total capacity of the lab',
  })
  async setLabCapacity(
    @Args('input') input: SetCapacityInput,
    @GqlCurrentUser() user: Omit<UserModelPrisma, 'password'>,
  ): Promise<LabSettingModel> {
    if (user) {
      this.logger.debug(
        `GraphQL Mutation: setLabCapacity - capacity: ${input.capacity} by User ID: ${user.id}, Email: ${user.email}`,
      );
    } else {
      this.logger.warn(
        `GraphQL Mutation: setLabCapacity - capacity: ${input.capacity} - NO USER INFO (AuthGuard Issue?)`,
      );
    }
    
    const settingFromService = await this.labSettingsService.setLabCapacity(input.capacity);

    return {
      key: settingFromService.key,
      value: settingFromService.value,
      notes: settingFromService.notes === null ? undefined : settingFromService.notes,
      createdAt: settingFromService.createdAt,
      updatedAt: settingFromService.updatedAt,
    };
  }

  @Public()
  @Query(() => [LabSettingModel], {
    name: 'labSettings',
    description: 'Get all lab settings',
  })
  async getAllSettings(): Promise<LabSettingModel[]> {
    this.logger.debug('GraphQL Query: getAllSettings (public)');
    const settingsFromService = await this.labSettingsService.getAllSettings();
    return settingsFromService.map(setting => ({
      key: setting.key,
      value: setting.value,
      notes: setting.notes === null ? undefined : setting.notes,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    }));
  }

  @Public()
  @Query(() => LabSettingModel, {
    name: 'labSetting',
    description: 'Get a lab setting by key',
    nullable: true, 
  })
  async getSetting(
    @Args('key', { type: () => String }) key: string,
  ): Promise<LabSettingModel | null> { 
    this.logger.debug(`GraphQL Query: getSetting - key: ${key} (public)`);
    const settingFromService = await this.labSettingsService.getSetting(key);
    if (!settingFromService) {
      this.logger.debug(`GraphQL Query: getSetting - No setting found for key: ${key}`);
      return null;
    }
    return {
      key: settingFromService.key,
      value: settingFromService.value,
      notes: settingFromService.notes === null ? undefined : settingFromService.notes,
      createdAt: settingFromService.createdAt,
      updatedAt: settingFromService.updatedAt,
    };
  }
}

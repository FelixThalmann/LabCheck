import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { LabSettingsService } from './lab-settings.service';
import { LabSettingModel } from './graphql/lab-setting.model';
import { SetCapacityInput } from './dto/set-capacity.input';
import { Logger } from '@nestjs/common';

@Resolver()
export class LabSettingsResolver {
  private readonly logger = new Logger(LabSettingsResolver.name);

  constructor(private readonly labSettingsService: LabSettingsService) {}

  @Query(() => Int, { name: 'labCapacity', description: 'Get the total capacity of the lab' })
  async getLabCapacity(): Promise<number> {
    this.logger.debug('GraphQL Query: getLabCapacity');
    return this.labSettingsService.getLabCapacity();
  }

  @Mutation(() => LabSettingModel, {
    name: 'setLabCapacity',
    description: 'Set the total capacity of the lab',
  })
  async setLabCapacity(
    @Args('input') input: SetCapacityInput,
  ): Promise<LabSettingModel> {
    this.logger.debug(`GraphQL Mutation: setLabCapacity - ${input.capacity}`);
    return this.labSettingsService.setLabCapacity(input.capacity);
  }

  @Query(() => [LabSettingModel], {
    name: 'labSettings',
    description: 'Get all lab settings',
  })
  async getAllSettings(): Promise<LabSettingModel[]> {
    this.logger.debug('GraphQL Query: getAllSettings');
    return this.labSettingsService.getAllSettings();
  }

  @Query(() => LabSettingModel, {
    name: 'labSetting',
    description: 'Get a lab setting by key',
  })
  async getSetting(
    @Args('key', { type: () => String }) key: string,
  ): Promise<LabSettingModel> {
    this.logger.debug(`GraphQL Query: getSetting - ${key}`);
    return this.labSettingsService.getSetting(key);
  }
}

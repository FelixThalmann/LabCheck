/* eslint-disable prettier/prettier */
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { SettingsService } from './settings.service';
import { LabSettingModel } from '../graphql/lab-setting.model'; // Correct path to the GraphQL model, ensuring it aligns with the project structure.
// Import UseGuards and JwtAuthGuard when authentication is implemented
// import { UseGuards } from '@nestjs/common';
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; // Adjust path if necessary when uncommenting.

/**
 * @class SettingsResolver
 * @description Resolver for handling GraphQL queries and mutations related to application settings.
 * It uses {@link SettingsService} to interact with the data layer, separating GraphQL logic from business logic.
 * The `@Resolver(() => LabSettingModel)` decorator marks this class as a GraphQL resolver
 * and indicates that `LabSettingModel` is the default GraphQL type it operates on.
 */
@Resolver(() => LabSettingModel)
export class SettingsResolver {
  /**
   * @constructor
   * @param {SettingsService} settingsService - The service responsible for settings business logic.
   * Injects `SettingsService` using NestJS dependency injection.
   * `private readonly` ensures `settingsService` is a private, immutable property of this class, adhering to best practices.
   */
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * @async
   * @method getLabCapacity
   * @description GraphQL Query to retrieve the currently configured total capacity of the lab.
   * This method exposes the `getLabCapacity` functionality of the `SettingsService` via GraphQL.
   * @returns {Promise<number>} A promise that resolves to the current lab capacity.
   */
  @Query(() => Int, { // Defines this method as a GraphQL Query returning an Integer.
    name: 'getLabCapacity', // Specifies the name of the query in the GraphQL schema.
    description: // Adhering to formatting preferences for longer description lines.
      'Retrieves the currently configured total capacity of the lab.',
  })
  async getLabCapacity(): Promise<number> {
    // Delegates the call to the injected SettingsService to fetch the lab capacity.
    // The resolver itself contains minimal logic, focusing on GraphQL exposure.
    return this.settingsService.getLabCapacity();
  }

  // @UseGuards(JwtAuthGuard) // Authentication guard to be activated in a later phase to protect this mutation.
  /**
   * @async
   * @method setLabCapacity
   * @description GraphQL Mutation to set the total capacity of the lab.
   * This method exposes the `setLabCapacity` functionality of the `SettingsService` via GraphQL.
   * @param {number} capacity - The new total capacity of the lab, provided as a GraphQL argument.
   * @returns {Promise<LabSettingModel>} A promise that resolves to the updated lab setting for capacity.
   */
  @Mutation(() => LabSettingModel, { // Defines this method as a GraphQL Mutation returning a LabSettingModel.
    name: 'setLabCapacity', // Specifies the name of the mutation in the GraphQL schema.
    description: 'Sets the total capacity of the lab.',
  })
  async setLabCapacity(
    @Args('capacity', { // Decorator to define 'capacity' as a GraphQL argument.
      type: () => Int, // Specifies the GraphQL type of the argument as Integer.
      description: 'The new total capacity of the lab.',
    })
    capacity: number, // The actual capacity value passed from the GraphQL client.
  ): Promise<LabSettingModel> {
    // Calls the service to perform the business logic of setting the lab capacity.
    // The service layer is responsible for data validation and persistence (e.g., interacting with Prisma).
    const labSettingFromService = await this.settingsService.setLabCapacity(capacity);

    // Manually construct the LabSettingModel from the data returned by the service (e.g., a Prisma entity).
    // This mapping step is crucial for several reasons:
    // 1. It ensures that the object returned to the client strictly conforms to the `LabSettingModel` GraphQL type.
    // 2. It decouples the GraphQL schema from the database schema; changes in the Prisma model don't automatically break the API.
    // 3. It allows for transformations, such as handling `null` vs `undefined` for optional fields, as shown with `notes`.
    return {
      key: labSettingFromService.key,
      value: labSettingFromService.value,
      // GraphQL schema might define 'notes' as nullable. If the database returns 'null' for an optional field,
      // it's good practice to map it to 'undefined'. This can simplify client-side logic, as 'undefined' often means "not present",
      // while 'null' is an explicit "no value". This aligns with how optional fields are typically handled in GraphQL.
      notes: labSettingFromService.notes === null ? undefined : labSettingFromService.notes,
      createdAt: labSettingFromService.createdAt,
      updatedAt: labSettingFromService.updatedAt,
    };
  }

  // Optional: General getters/setters for settings, if needed.
  // This section provides more generic access to individual settings beyond just lab capacity.
  /**
   * @async
   * @method getSetting
   * @description GraphQL Query to retrieve a specific lab setting by its key.
   * Allows fetching any setting by its unique identifier (key).
   * @param {string} key - The key of the setting to retrieve, provided as a GraphQL argument.
   * @returns {Promise<LabSettingModel | null>} A promise that resolves to the lab setting or null if not found.
   */
  @Query(() => LabSettingModel, { // Defines this method as a GraphQL Query.
    name: 'getLabSetting', // Name of the query in the GraphQL schema.
    nullable: true, // Indicates that this query can return null (e.g., if the setting with the given key is not found).
    description: 'Retrieves a specific lab setting by its key.',
  })
  async getSetting(@Args('key') key: string): Promise<LabSettingModel | null> {
    // Delegate to the SettingsService to fetch the setting by its key.
    const labSettingFromService = await this.settingsService.getSetting(key);

    // If the service returns null (or undefined), it signifies that the setting was not found.
    // In this case, return null, adhering to the GraphQL schema's `nullable: true` specification for this query.
    if (!labSettingFromService) {
      return null;
    }

    // Map the data returned by the service (e.g., a Prisma entity) to the LabSettingModel GraphQL type.
    // The spread operator (...) efficiently copies all enumerable properties from `labSettingFromService`.
    // This is followed by explicit handling of the 'notes' field to ensure consistency with GraphQL nullability preferences.
    return {
      ...labSettingFromService, // Copies properties like key, value, createdAt, updatedAt.
      // Ensures consistent handling of the 'notes' field: map database `null` to `undefined`.
      // This aligns with the common GraphQL practice where optional fields that are not set are `undefined` or absent,
      // rather than explicitly `null`, unless `null` has a specific semantic meaning in the domain.
      notes: labSettingFromService.notes === null ? undefined : labSettingFromService.notes,
    };
  }

  // @UseGuards(JwtAuthGuard) // Authentication guard to be activated in a later phase.
  /**
   * @async
   * @method setSetting
   * @description GraphQL Mutation to create or update a specific lab setting.
   * Allows setting any arbitrary setting by its key and value.
   * @param {string} key - The key of the setting, provided as a GraphQL argument.
   * @param {string} value - The value of the setting, provided as a GraphQL argument.
   * @returns {Promise<LabSettingModel>} A promise that resolves to the created or updated lab setting.
   */
  @Mutation(() => LabSettingModel, { // Defines this method as a GraphQL Mutation.
    name: 'setLabSetting', // Name of the mutation in the GraphQL schema.
    description: 'Creates or updates a specific lab setting.',
  })
  async setSetting(
    @Args('key') key: string, // The key of the setting to create or update.
    @Args('value') value: string, // The new value for the setting.
  ): Promise<LabSettingModel> {
    // Delegate to the SettingsService to perform the create or update operation.
    // The service will handle the logic of finding an existing setting by key or creating a new one.
    const labSettingFromService = await this.settingsService.setSetting(key, value);

    // Map the data returned by the service (Prisma entity) to the LabSettingModel GraphQL type.
    // This ensures the response sent to the client conforms to the defined GraphQL schema.
    return {
      ...labSettingFromService, // Spread operator for common fields.
      // Consistent handling of the 'notes' field for GraphQL nullability.
      notes: labSettingFromService.notes === null ? undefined : labSettingFromService.notes,
    };
  }
}

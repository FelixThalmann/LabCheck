/* eslint-disable prettier/prettier */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LabSettingModel } from './graphql/lab-setting.model';

/**
 * @const LAB_CAPACITY_KEY
 * @description The key used in the database to store the lab's total capacity setting.
 * @type {string}
 */
const LAB_CAPACITY_KEY = 'lab_total_capacity';

/**
 * @const DEFAULT_LAB_CAPACITY
 * @description The default capacity value for the lab if no specific setting is found or configured.
 * This value is used during the initial setup or if the setting is somehow missing.
 * @type {number}
 */
const DEFAULT_LAB_CAPACITY = 20;

/**
 * @class LabSettingsService
 * @description This service is responsible for managing all business logic related to laboratory settings.
 * It provides an abstraction layer over the database interactions, handled via {@link PrismaService},
 * for creating, retrieving, updating, and deleting lab-specific configurations.
 * Key responsibilities include managing the lab's total capacity and providing access to other general settings.
 * The service ensures that critical settings, like lab capacity, are initialized with default values
 * if they are not already present in the database.
 *
 * It is designed to be injected into resolvers or other services that require access to lab settings.
 * All public methods are asynchronous, returning Promises, to align with modern JavaScript practices
 * and the asynchronous nature of database operations.
 */
@Injectable()
export class LabSettingsService {
  /**
   * @private
   * @readonly
   * @type {Logger}
   * @description An instance of the NestJS Logger, scoped to the `LabSettingsService` context.
   * This logger is used for recording important events, warnings, errors, and debug information
   * throughout the service's operations, aiding in monitoring and troubleshooting.
   */
  private readonly logger = new Logger(LabSettingsService.name);

  /**
   * @constructor
   * @param {PrismaService} prisma - An instance of the {@link PrismaService}, injected by NestJS.
   * This service provides the methods to interact with the application's database.
   * @description Initializes the `LabSettingsService`. Upon instantiation, it immediately attempts
   * to ensure that the fundamental lab capacity setting exists in the database by calling
   * {@link ensureLabCapacitySetting}. This proactive initialization guarantees that the system
   * always has a defined lab capacity. Any errors during this initial setup are logged.
   */
  constructor(private readonly prisma: PrismaService) {
    // On service startup, ensure the critical lab capacity setting exists.
    // This is a "fire-and-forget" call with error handling to prevent startup crashes
    // if the database is temporarily unavailable, though such issues would manifest later.
    this.ensureLabCapacitySetting().catch((error) => {
      this.logger.error(
        'Critical Error: Failed to ensure lab capacity setting exists on service startup. This may impact lab operations.',
        error.stack, // Log the stack trace for better debugging
      );
    });
  }

  /**
   * @private
   * @async
   * @method ensureLabCapacitySetting
   * @description Ensures that the lab capacity setting (identified by {@link LAB_CAPACITY_KEY})
   * exists in the database. If the setting is not found, it creates a new entry
   * with the {@link DEFAULT_LAB_CAPACITY}. This method is critical for the system's
   * stability, as it guarantees that a lab capacity value is always available.
   * It's typically called during service initialization but can also be invoked
   * if a `getLabCapacity` call finds the setting missing.
   *
   * @returns {Promise<void>} A promise that resolves when the check and potential creation
   * are complete. It does not return any value.
   */
  private async ensureLabCapacitySetting(): Promise<void> {
    this.logger.debug(
      `Checking for existence of lab capacity setting ('${LAB_CAPACITY_KEY}').`,
    );
    const existingSetting = await this.prisma.labSetting.findUnique({
      where: { key: LAB_CAPACITY_KEY },
    });

    if (!existingSetting) {
      this.logger.log(
        `Lab capacity setting ('${LAB_CAPACITY_KEY}') not found. Proceeding to create it with default value: ${DEFAULT_LAB_CAPACITY}.`,
      );
      try {
        await this.prisma.labSetting.create({
          data: {
            key: LAB_CAPACITY_KEY,
            value: DEFAULT_LAB_CAPACITY.toString(), // Store as string, as per Prisma schema
          },
        });
        this.logger.log(
          `Successfully created lab capacity setting ('${LAB_CAPACITY_KEY}') with default value: ${DEFAULT_LAB_CAPACITY}.`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create default lab capacity setting ('${LAB_CAPACITY_KEY}').`,
          error.stack,
        );
        // Depending on application requirements, this might need to throw to halt operations
        // or be handled by a retry mechanism. For now, it logs the error.
      }
    } else {
      this.logger.debug(
        `Lab capacity setting ('${LAB_CAPACITY_KEY}') already exists with value: ${existingSetting.value}. No action needed.`,
      );
    }
  }

  /**
   * @async
   * @method getLabCapacity
   * @description Retrieves the currently configured total capacity of the lab.
   * It first attempts to find the setting in the database using {@link LAB_CAPACITY_KEY}.
   * If the setting is not found, this method will invoke {@link ensureLabCapacitySetting}
   * to create it with the {@link DEFAULT_LAB_CAPACITY}, and then return this default value.
   * This defensive approach ensures that the application can always obtain a valid capacity figure.
   * The stored value, which is a string, is parsed into an integer before being returned.
   *
   * @returns {Promise<number>} A promise that resolves to the current lab capacity as an integer.
   */
  async getLabCapacity(): Promise<number> {
    this.logger.debug(
      `Attempting to retrieve lab capacity setting ('${LAB_CAPACITY_KEY}').`,
    );
    const setting = await this.prisma.labSetting.findUnique({
      where: { key: LAB_CAPACITY_KEY },
    });

    if (!setting) {
      this.logger.warn(
        `Lab capacity setting ('${LAB_CAPACITY_KEY}') not found in database. Ensuring it exists and returning default value: ${DEFAULT_LAB_CAPACITY}.`,
      );
      // If the setting doesn't exist (e.g., deleted manually or initial setup failed partially),
      // ensure it's created with the default value.
      await this.ensureLabCapacitySetting(); // This will create it if it's missing.
      this.logger.log(
        `Returning default lab capacity (${DEFAULT_LAB_CAPACITY}) as the setting was re-initialized.`,
      );
      return DEFAULT_LAB_CAPACITY;
    }

    // The value is stored as a string in the database, so it needs to be parsed.
    const capacity = parseInt(setting.value, 10);
    if (isNaN(capacity)) {
      this.logger.error(
        `Corrupted lab capacity value found in database for key '${LAB_CAPACITY_KEY}': '${setting.value}'. Returning default capacity ${DEFAULT_LAB_CAPACITY}.`,
      );
      // Fallback to default if parsing fails, and perhaps log a more severe error or alert.
      return DEFAULT_LAB_CAPACITY;
    }
    this.logger.debug(
      `Successfully retrieved and parsed lab capacity: ${capacity}.`,
    );
    return capacity;
  }

  /**
   * @async
   * @method setLabCapacity
   * @description Sets or updates the lab's total capacity.
   * The provided capacity value must be a non-negative integer.
   * This method uses Prisma's `upsert` operation:
   * - If a setting with {@link LAB_CAPACITY_KEY} exists, its value is updated.
   * - If it does not exist, a new setting is created with the provided capacity.
   * The `updatedAt` field is automatically managed by Prisma on updates, but explicitly set here for clarity.
   *
   * @param {number} capacity - The new capacity value for the lab. Must be a non-negative integer.
   * @throws {BadRequestException} If the provided `capacity` is negative or not an integer.
   * @returns {Promise<LabSettingModel>} A promise that resolves to the {@link LabSettingModel}
   * representation of the updated or newly created lab capacity setting.
   */
  async setLabCapacity(capacity: number): Promise<LabSettingModel> {
    this.logger.debug(
      `Attempting to set lab capacity ('${LAB_CAPACITY_KEY}') to: ${capacity}.`,
    );

    // Input validation is crucial for robust services.
    if (typeof capacity !== 'number' || !Number.isInteger(capacity)) {
      const errorMessage = 'Capacity must be an integer.';
      this.logger.error(
        `Validation Error: ${errorMessage} Received: ${capacity} (type: ${typeof capacity}).`,
      );
      throw new BadRequestException(errorMessage);
    }
    if (capacity < 0) {
      const errorMessage = 'Capacity cannot be negative.';
      this.logger.error(
        `Validation Error: ${errorMessage} Received: ${capacity}.`,
      );
      throw new BadRequestException(errorMessage);
    }

    const updatedSetting = await this.prisma.labSetting.upsert({
      where: { key: LAB_CAPACITY_KEY },
      update: {
        value: capacity.toString(), // Store as string
        updatedAt: new Date(), // Explicitly set updatedAt for the update operation
      },
      create: {
        key: LAB_CAPACITY_KEY,
        value: capacity.toString(), // Store as string
        // createdAt and updatedAt are handled by Prisma for create
      },
    });

    this.logger.log(
      `Successfully set/updated lab capacity ('${LAB_CAPACITY_KEY}') to: ${capacity}.`,
    );

    // Map the Prisma model to the GraphQL model (LabSettingModel).
    // This is good practice for decoupling the service layer from specific ORM/database structures
    // if the GraphQL model differs significantly or needs transformation.
    return {
      key: updatedSetting.key,
      value: updatedSetting.value,
      createdAt: updatedSetting.createdAt,
      updatedAt: updatedSetting.updatedAt,
    };
  }

  /**
   * @async
   * @method getSetting
   * @description Retrieves a specific lab setting from the database by its unique key.
   * This is a generic method that can be used to fetch any setting stored in the `LabSetting` table,
   * not just the lab capacity.
   *
   * @param {string} key - The unique key of the setting to retrieve (e.g., 'lab_total_capacity', 'maintenance_mode').
   * @throws {NotFoundException} If no setting with the provided `key` is found in the database.
   * @returns {Promise<LabSettingModel>} A promise that resolves to the {@link LabSettingModel}
   * representation of the requested setting.
   */
  async getSetting(key: string): Promise<LabSettingModel> {
    this.logger.debug(`Attempting to retrieve setting with key: '${key}'.`);

    if (!key || typeof key !== 'string' || key.trim() === '') {
        const errorMessage = 'Setting key must be a non-empty string.';
        this.logger.error(`Validation Error: ${errorMessage} Received key: '${key}'.`);
        throw new BadRequestException(errorMessage);
    }

    const setting = await this.prisma.labSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      this.logger.warn(`Setting with key '${key}' not found in database.`);
      throw new NotFoundException(`Setting with key '${key}' not found.`);
    }

    this.logger.debug(
      `Successfully retrieved setting with key: '${key}'.`,
    );

    // Map Prisma model to GraphQL model.
    return {
      key: setting.key, // Assuming LabSettingModel includes id
      value: setting.value,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }

  /**
   * @async
   * @method getAllSettings
   * @description Retrieves all lab settings currently stored in the database.
   * This method fetches every record from the `LabSetting` table.
   *
   * @returns {Promise<LabSettingModel[]>} A promise that resolves to an array of {@link LabSettingModel} objects.
   * If no settings are found, it resolves to an empty array.
   */
  async getAllSettings(): Promise<LabSettingModel[]> {
    this.logger.debug('Attempting to retrieve all lab settings from database.');
    const settings = await this.prisma.labSetting.findMany();

    if (settings.length === 0) {
      this.logger.log('No lab settings found in the database.');
    } else {
      this.logger.debug(`Found ${settings.length} lab settings.`);
    }

    // Map each Prisma LabSetting model to the LabSettingModel GraphQL type.
    return settings.map((setting) => ({ // Assuming LabSettingModel includes id
      key: setting.key,
      value: setting.value,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    }));
  }
}

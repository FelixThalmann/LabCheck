import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException, // Added for input validation
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service'; // Adjust path if necessary
import { LabSetting } from '@prisma/client';

/**
 * @constant LAB_TOTAL_CAPACITY_KEY
 * @description The key used in the database to store the lab's total capacity setting.
 */
export const LAB_TOTAL_CAPACITY_KEY = 'lab_total_capacity';

/**
 * @class SettingsService
 * @description Service responsible for managing application-wide settings,
 * particularly lab-specific configurations like total capacity.
 * It interacts with the Prisma service to persist and retrieve settings from the database.
 * Note: Filename is settings.service.ts, class name is SettingsService.
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  /**
   * @constructor
   * @param {PrismaService} prisma - The Prisma service for database interactions.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @async
   * @method getLabCapacity
   * @description Retrieves the currently configured lab capacity.
   * If the setting is not found in the database or its value is invalid,
   * this method logs a warning and returns a default value of 0.
   * This ensures that the application can always obtain a capacity value,
   * even if the setting is missing or misconfigured.
   * @returns {Promise<number>} A promise that resolves to the current lab capacity as a number.
   * @throws {InternalServerErrorException} If there's an unexpected issue fetching the setting from the database.
   */
  async getLabCapacity(): Promise<number> {
    this.logger.debug('Attempting to get lab capacity');
    try {
      // Fetch the setting from the database using its unique key.
      const setting = await this.prisma.labSetting.findUnique({
        where: { key: LAB_TOTAL_CAPACITY_KEY },
      });

      // Check if the setting exists and has a value.
      if (!setting || !setting.value) {
        this.logger.warn(
          `${LAB_TOTAL_CAPACITY_KEY} not found or has no value, returning default 0`,
        );
        return 0; // Default value if not set or has no value.
      }

      // Parse the stored string value to an integer (base 10).
      const capacity = parseInt(setting.value, 10);

      // Validate if the parsed value is a valid number.
      if (isNaN(capacity)) {
        this.logger.error(
          `${LAB_TOTAL_CAPACITY_KEY} value '${setting.value}' is not a valid number, returning 0`,
        );
        return 0; // Default value if parsing fails or value is not a number.
      }

      this.logger.log(`Successfully retrieved lab capacity: ${capacity}`);
      return capacity;
    } catch (error: unknown) { // Catching error as unknown for robust error handling.
      // Log the error with stack trace if available.
      this.logger.error(
        'Error fetching lab capacity',
        error instanceof Error ? error.stack : String(error),
      );
      // Throw a standard NestJS exception to be handled by the global error filter.
      throw new InternalServerErrorException('Could not retrieve lab capacity.');
    }
  }

  /**
   * @async
   * @method setLabCapacity
   * @description Sets or updates the lab capacity to a new value.
   * The capacity value must be a non-negative number.
   * It uses Prisma's `upsert` operation to either create the setting if it doesn't exist
   * or update it if it already exists.
   * @param {number} capacity - The new capacity value to set. Must be non-negative.
   * @returns {Promise<LabSetting>} A promise that resolves to the updated lab setting object from Prisma.
   * @throws {BadRequestException} If the provided capacity is negative, indicating invalid input.
   * @throws {InternalServerErrorException} If there's an unexpected issue persisting the setting to the database.
   */
  async setLabCapacity(capacity: number): Promise<LabSetting> {
    this.logger.debug(`Attempting to set lab capacity to ${capacity}`);

    // Validate input: capacity cannot be negative.
    if (capacity < 0) {
      this.logger.warn(`Attempted to set negative capacity: ${capacity}`);
      // Throw BadRequestException for client errors (invalid input).
      throw new BadRequestException('Capacity cannot be negative.');
    }

    try {
      // Use Prisma's upsert:
      // - If a LabSetting with `key: LAB_TOTAL_CAPACITY_KEY` exists, it's updated.
      // - Otherwise, a new LabSetting is created with the specified key and value.
      const updatedSetting = await this.prisma.labSetting.upsert({
        where: { key: LAB_TOTAL_CAPACITY_KEY },
        update: { value: capacity.toString() }, // Store capacity as a string.
        create: { key: LAB_TOTAL_CAPACITY_KEY, value: capacity.toString() },
      });
      this.logger.log(
        `Successfully set lab capacity to ${updatedSetting.value}`,
      );
      return updatedSetting;
    } catch (error: unknown) { // Catching error as unknown for robust error handling.
      this.logger.error(
        `Error setting lab capacity to ${capacity}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Could not set lab capacity.');
    }
  }

  // Future methods for other settings can be added here.

  /**
   * @async
   * @method getSetting
   * @description Retrieves a specific setting by its key.
   * This is a generic method to fetch any setting stored in the LabSetting table.
   * @param {string} key - The unique key of the setting to retrieve.
   * @returns {Promise<LabSetting | null>} A promise that resolves to the setting object if found,
   * or null if no setting with the given key exists.
   */
  async getSetting(key: string): Promise<LabSetting | null> {
    this.logger.debug(`Attempting to get setting with key: ${key}`);
    // Directly query the database for a setting with the given key.
    return this.prisma.labSetting.findUnique({ where: { key } });
  }

  /**
   * @async
   * @method setSetting
   * @description Creates a new setting or updates an existing one, identified by its key.
   * This is a generic method to persist any key-value pair as a setting.
   * It uses Prisma's `upsert` for an efficient create-or-update operation.
   * @param {string} key - The unique key of the setting.
   * @param {string} value - The value of the setting to be stored.
   * @returns {Promise<LabSetting>} A promise that resolves to the created or updated setting object from Prisma.
   * @throws {InternalServerErrorException} If there's an unexpected issue persisting the setting.
   */
  async setSetting(key: string, value: string): Promise<LabSetting> {
    this.logger.debug(`Attempting to set setting with key: ${key}, value: ${value}`);
    try {
        // Use Prisma's upsert:
        // - If a LabSetting with the given `key` exists, its `value` is updated.
        // - Otherwise, a new LabSetting is created with the specified `key` and `value`.
      const setting = await this.prisma.labSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      this.logger.log(`Successfully set setting for key: ${key}`);
      return setting;
    } catch (error: unknown) {
        this.logger.error(
            `Error setting/updating setting for key ${key}`,
            error instanceof Error ? error.stack : String(error),
        );
        throw new InternalServerErrorException(`Could not set setting for key ${key}.`);
    }
  }
}

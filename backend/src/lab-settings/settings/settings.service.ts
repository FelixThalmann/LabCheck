import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service'; // Pfad anpassen
import { LabSetting } from '@prisma/client';

export const LAB_TOTAL_CAPACITY_KEY = 'lab_total_capacity';

@Injectable()
export class SettingsService { // Beachten Sie: Dateiname ist settings.service.ts, Klasse heißt SettingsService
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getLabCapacity(): Promise<number> {
    this.logger.debug('Attempting to get lab capacity');
    try {
      const setting = await this.prisma.labSetting.findUnique({
        where: { key: LAB_TOTAL_CAPACITY_KEY },
      });

      if (!setting || !setting.value) {
        this.logger.warn(`${LAB_TOTAL_CAPACITY_KEY} not found or has no value, returning default 0`);
        return 0; // Standardwert, falls nicht gesetzt
      }
      const capacity = parseInt(setting.value, 10);
      if (isNaN(capacity)) {
        this.logger.error(`${LAB_TOTAL_CAPACITY_KEY} value '${setting.value}' is not a valid number, returning 0`);
        return 0;
      }
      this.logger.log(`Successfully retrieved lab capacity: ${capacity}`);
      return capacity;
    } catch (error) {
      this.logger.error('Error fetching lab capacity', error.stack);
      throw new InternalServerErrorException('Could not retrieve lab capacity.');
    }
  }

  async setLabCapacity(capacity: number): Promise<LabSetting> {
    this.logger.debug(`Attempting to set lab capacity to ${capacity}`);
    if (capacity < 0) {
        this.logger.warn(`Attempted to set negative capacity: ${capacity}`);
        // Hier könnte man einen BadRequestException werfen
        throw new Error('Capacity cannot be negative.'); // Einfacher Error für den Moment
    }
    try {
      const updatedSetting = await this.prisma.labSetting.upsert({
        where: { key: LAB_TOTAL_CAPACITY_KEY },
        update: { value: capacity.toString() },
        create: { key: LAB_TOTAL_CAPACITY_KEY, value: capacity.toString() },
      });
      this.logger.log(`Successfully set lab capacity to ${updatedSetting.value}`);
      return updatedSetting;
    } catch (error) {
      this.logger.error(`Error setting lab capacity to ${capacity}`, error.stack);
      throw new InternalServerErrorException('Could not set lab capacity.');
    }
  }

  // Zukünftige Methoden für andere Einstellungen können hier hinzugefügt werden
  async getSetting(key: string): Promise<LabSetting | null> {
    return this.prisma.labSetting.findUnique({ where: { key } });
  }

  async setSetting(key: string, value: string): Promise<LabSetting> {
    return this.prisma.labSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

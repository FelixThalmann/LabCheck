import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LabSettingModel } from './graphql/lab-setting.model';

const LAB_CAPACITY_KEY = 'lab_total_capacity';
const DEFAULT_LAB_CAPACITY = 20; // Standardkapazität, falls keine gesetzt ist

@Injectable()
export class LabSettingsService {
  private readonly logger = new Logger(LabSettingsService.name);

  constructor(private readonly prisma: PrismaService) {
    // Beim Start des Services sicherstellen, dass die Kapazitätseinstellung existiert
    this.ensureLabCapacitySetting().catch((error) => {
      this.logger.error('Failed to ensure lab capacity setting exists:', error);
    });
  }

  /**
   * Stellt sicher, dass die Laborkapazitätseinstellung in der Datenbank existiert
   */
  private async ensureLabCapacitySetting(): Promise<void> {
    const existingSetting = await this.prisma.labSetting.findUnique({
      where: { key: LAB_CAPACITY_KEY },
    });

    if (!existingSetting) {
      this.logger.log(
        `Lab capacity setting not found, creating with default value: ${DEFAULT_LAB_CAPACITY}`,
      );
      await this.prisma.labSetting.create({
        data: {
          key: LAB_CAPACITY_KEY,
          value: DEFAULT_LAB_CAPACITY.toString(),
        },
      });
    }
  }

  /**
   * Ruft die aktuell konfigurierte Laborkapazität ab
   * @returns Die aktuelle Kapazität als Zahl
   */
  async getLabCapacity(): Promise<number> {
    const setting = await this.prisma.labSetting.findUnique({
      where: { key: LAB_CAPACITY_KEY },
    });

    if (!setting) {
      // Falls die Einstellung nicht existiert, erstellen wir sie mit dem Standardwert
      await this.ensureLabCapacitySetting();
      return DEFAULT_LAB_CAPACITY;
    }

    return parseInt(setting.value, 10);
  }

  /**
   * Setzt die Laborkapazität auf einen neuen Wert
   * @param capacity Die neue Kapazität
   * @returns Die aktualisierte Einstellung
   */
  async setLabCapacity(capacity: number): Promise<LabSettingModel> {
    if (capacity < 0) {
      throw new Error('Capacity cannot be negative');
    }

    const updatedSetting = await this.prisma.labSetting.upsert({
      where: { key: LAB_CAPACITY_KEY },
      update: {
        value: capacity.toString(),
        updatedAt: new Date(),
      },
      create: {
        key: LAB_CAPACITY_KEY,
        value: capacity.toString(),
      },
    });

    this.logger.log(`Updated lab capacity to: ${capacity}`);

    return {
      key: updatedSetting.key,
      value: updatedSetting.value,
      updatedAt: updatedSetting.updatedAt,
      createdAt: updatedSetting.createdAt,
    };
  }

  /**
   * Ruft eine Einstellung anhand ihres Schlüssels ab
   * @param key Schlüssel der Einstellung
   * @returns Die Einstellung als LabSettingModel
   */
  async getSetting(key: string): Promise<LabSettingModel> {
    const setting = await this.prisma.labSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key ${key} not found`);
    }

    return {
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt,
      createdAt: setting.createdAt,
    };
  }

  /**
   * Ruft alle verfügbaren Einstellungen ab
   * @returns Liste aller Einstellungen
   */
  async getAllSettings(): Promise<LabSettingModel[]> {
    const settings = await this.prisma.labSetting.findMany();
    
    return settings.map((setting) => ({
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt,
      createdAt: setting.createdAt,
    }));
  }
}

import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DoorService } from '../../door/door/door.service';
import { LabSettingsService } from '../../lab-settings/lab-settings.service';
import { OccupancyServicePlaceholder } from '../lab-status.resolver';
import { 
  LabStatusResponseDto, 
  LabCapacityResponseDto, 
  LabSettingResponseDto 
} from '../dto';

/**
 * @class LabStatusService
 * @description Erweiterte Service für Laborstatus-Geschäftslogik
 * Unterstützt sowohl REST API als auch Legacy GraphQL Funktionalität
 * Wiederverwendung der bestehenden Services (DoorService, LabSettingsService)
 */
@Injectable()
export class LabStatusService {
  private readonly logger = new Logger(LabStatusService.name);

  constructor(
    private readonly doorService: DoorService,
    private readonly labSettingsService: LabSettingsService,
    private readonly occupancyService: OccupancyServicePlaceholder,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @method calculateColor
   * @description Berechnet die Farbkodierung basierend auf Belegungsgrad
   * Implementiert die Farblogik aus der API-Dokumentation
   */
  private calculateColor(currentOccupancy: number, maxOccupancy: number): string {
    if (maxOccupancy === 0) return 'green';
    
    const percentage = (currentOccupancy / maxOccupancy) * 100;
    
    if (percentage >= 90) return 'red';
    if (percentage >= 60) return 'yellow';
    return 'green';
  }

  /**
   * @method getCombinedLabStatus
   * @description Liefert den kombinierten Laborstatus für REST API
   * Nutzt bestehende Services zur Datensammlung
   */
  async getCombinedLabStatus(): Promise<LabStatusResponseDto> {
    this.logger.debug('Collecting combined lab status data');
    
    const currentTime = new Date();
    
    try {
      // Türstatus abrufen (nutzt bestehenden DoorService)
      const doorStatus = await this.doorService.getLatestDoorStatus();
      const isOpen = doorStatus?.isOpen ?? false;
      
      // Belegung abrufen (nutzt bestehenden DoorService)
      const occupancyData = await this.doorService.getCurrentOccupancy();
      const currentOccupancy = occupancyData?.currentOccupancy ?? 0;
      
      // Kapazität abrufen (nutzt bestehenden LabSettingsService)
      const maxOccupancy = await this.labSettingsService.getLabCapacity();
      
      // Farbe berechnen
      const color = this.calculateColor(currentOccupancy, maxOccupancy);
      
      const result: LabStatusResponseDto = {
        isOpen,
        currentOccupancy,
        maxOccupancy,
        color,
        currentDate: currentTime.toISOString(),
        lastUpdated: currentTime.toISOString(),
      };
      
      this.logger.debug(`Lab status compiled: ${JSON.stringify(result)}`);
      return result;
      
    } catch (error) {
      this.logger.error('Error collecting lab status data', error.stack);
      throw error;
    }
  }

  /**
   * @method getCombinedLabStatusLegacy
   * @description Liefert den kombinierten Laborstatus mit exakter Resolver-Logik
   * Nutzt OccupancyServicePlaceholder wie der GraphQL Resolver
   */
  async getCombinedLabStatusLegacy(): Promise<LabStatusResponseDto> {
    this.logger.debug('Collecting combined lab status data (legacy resolver logic)');
    
    const currentTime = new Date();
    
    try {
      // 1. Türstatus abrufen (wie im Resolver)
      const doorStatus = await this.doorService.getLatestDoorStatus();
      const isOpen = doorStatus?.isOpen ?? false;
      
      // 2. Belegung über OccupancyPlaceholder (wie im Resolver)
      const occupancyData = await this.occupancyService.getCurrentOccupancy();
      const currentOccupancy = occupancyData?.currentOccupancy ?? 0;
      
      // 3. Kapazität
      const maxOccupancy = await this.labSettingsService.getLabCapacity() ?? 0;
      
      // 4. Farbe berechnen (60%/90% Schwellwerte)
      const color = this.calculateColor(currentOccupancy, maxOccupancy);
      
      const result: LabStatusResponseDto = {
        isOpen,
        currentOccupancy,
        maxOccupancy,
        color,
        currentDate: currentTime.toISOString(),
        lastUpdated: currentTime.toISOString(),
      };
      
      this.logger.debug(`Lab status (legacy) compiled: ${JSON.stringify(result)}`);
      return result;
      
    } catch (error) {
      this.logger.error('Error collecting lab status data (legacy)', error.stack);
      throw error;
    }
  }

  /**
   * @method getLabCapacity
   * @description Liefert die aktuelle Laborkapazität
   */
  async getLabCapacity(): Promise<LabCapacityResponseDto> {
    this.logger.debug('Getting lab capacity');
    
    try {
      const capacity = await this.labSettingsService.getLabCapacity();
      
      return {
        capacity,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting lab capacity', error.stack);
      throw error;
    }
  }

  /**
   * @method setLabCapacity
   * @description Setzt die Laborkapazität mit Passwort-Schutz
   * Entspricht der GraphQL setLabCapacity Mutation
   */
  async setLabCapacity(capacity: number, password: string): Promise<LabSettingResponseDto> {
    this.logger.debug(`Setting lab capacity to: ${capacity}`);
    
    // Passwort-Validierung
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');
    if (password !== adminPassword) {
      this.logger.warn(`Invalid password attempt for setLabCapacity`);
      throw new UnauthorizedException('Ungültiges Administratorpasswort');
    }
    
    try {
      const labSetting = await this.labSettingsService.setLabCapacity(capacity);
      
      // Mapping wie im GraphQL Resolver
      return {
        key: labSetting.key,
        value: labSetting.value,
        notes: labSetting.notes === null ? undefined : labSetting.notes,
        createdAt: labSetting.createdAt.toISOString(),
        updatedAt: labSetting.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Error setting lab capacity', error.stack);
      throw error;
    }
  }
}

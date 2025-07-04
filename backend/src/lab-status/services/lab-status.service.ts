/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, UnauthorizedException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  LabStatusResponseDto, 
  LabCapacityResponseDto, 
} from '../dto';
import { PrismaService } from '../../prisma.service';
import { EventsGateway } from '../../events/events/events.gateway';
import { HolidayService } from '../../predictions/services/holiday.service';

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
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly holidayService: HolidayService,
  ) {}

  /**
   * @method calculateColor
   * @description Berechnet die Farbkodierung basierend auf Belegungsgrad
   * Implementiert die Farblogik aus der API-Dokumentation
   */
  private calculateColor(currentOccupancy: number, maxOccupancy: number): string {
    if (maxOccupancy <= 0) {
      return 'red'; // Fallback, falls Kapazität nicht positiv ist
    }

    const percentage = (currentOccupancy / maxOccupancy) * 100;

    if (percentage >= 90) return 'red';
    if (percentage >= 50) return 'yellow';
    return 'green';
  }

  /**
   * @method getCombinedLabStatus
   * @description Liefert den kombinierten Laborstatus für REST API
   * Nutzt bestehende Services zur Datensammlung
   */
  async getCombinedLabStatus(): Promise<LabStatusResponseDto> {
    this.logger.debug('Sammle kombinierten Laborstatus (Kapazität direkt aus Room-Tabelle)');

    const currentTime = new Date();

    try {
      // Kapazität direkt aus Room-Tabelle holen
      const mainRoom = await this.prisma.room.findFirst();

      if (!mainRoom) {
        this.logger.error('Kein Laborraum gefunden.');
        throw new BadRequestException('Kein Laborraum gefunden.');
      }

      // Check if it is a weekend or holiday
      const isWeekend = currentTime.getDay() === 0 || currentTime.getDay() === 6;
      const isHoliday = await this.holidayService.isHoliday(currentTime);
      if (isWeekend || isHoliday) {
        this.logger.debug('Laborraum ist geschlossen, da es ein Wochenende oder Feiertag ist');
        return {
          isOpen: false,
          currentOccupancy: 0,
          maxOccupancy: mainRoom.maxCapacity,
          color: 'red',
          currentDate: currentTime.toISOString(),
          lastUpdated: currentTime.toISOString(),
        };
      }

      const currentOccupancy = mainRoom.capacity;
      const isOpen = mainRoom.isOpen
      const maxOccupancy: number = mainRoom.maxCapacity;

      // Farbe berechnen - ROT wenn Tür geschlossen, sonst Belegungslogik
      const color = !isOpen ? 'red' : this.calculateColor(currentOccupancy, maxOccupancy);

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

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Fehler beim Sammeln des Laborstatus', errorStack || errorMessage);
      throw error;
    }
  }

  /**
   * @method getLabCapacity
   * @description Liefert die aktuelle Laborkapazität direkt aus der Room-Tabelle (capacity des aktiven Raums)
   */
  async getLabCapacity(): Promise<number> {
    this.logger.debug('Hole aktuelle Laborkapazität direkt aus der Room-Tabelle');

    try {
      // Hole den ersten Laborraum (ältester zuerst)
      const mainRoom = await this.prisma.room.findFirst();

      if (!mainRoom) {
        this.logger.error('Kein Laborraum gefunden.');
        throw new BadRequestException('Kein Laborraum gefunden.');
      }

      return mainRoom.capacity;
    } catch (error) {
      this.logger.error('Fehler beim Abrufen der Laborkapazität', error.stack);
      throw error;
    }
  }

  /**
   * @method getMaxCapacity
   * @description Gibt die maximale Kapazität (maxCapacity) des aktiven Laborraums zurück.
   * @returns {Promise<number>} Die maximale Kapazität des aktiven Raums.
   * @throws {BadRequestException} Wenn kein aktiver Raum gefunden wird.
   */
  async getMaxCapacity(): Promise<LabCapacityResponseDto> {
    this.logger.debug('Hole maxCapacity des Laborraums aus der Room-Tabelle');

    try {
      const mainRoom = await this.prisma.room.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      if (!mainRoom) {
        this.logger.error('Kein Laborraum gefunden.');
        throw new BadRequestException('Kein Laborraum gefunden.');
      }

      return { 
        capacity: mainRoom.maxCapacity, 
        lastUpdated: new Date().toISOString() 
      };
    } catch (error) {
      this.logger.error('Fehler beim Abrufen der maxCapacity des Labors', error.stack);
      throw error;
    }
  }

  /**
   * @method setLabCapacity
   * @description Setzt die Laborkapazität mit Passwort-Schutz für einen spezifischen Raum
   * @param roomId - Die ID des Raums
   * @param capacity - Die neue Kapazität
   * @param password - Das Administratorpasswort
   */
  async setLabCapacity(capacity: number, password: string): Promise<{ success: boolean; message: string }> {
    this.logger.debug(`Setting lab capacity to: ${capacity}`);
    
    // Passwort-Validierung
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');
    if (password !== adminPassword) {
      this.logger.warn('Ungültiger Passwortversuch für setLabCapacity');
      throw new UnauthorizedException('Ungültiges Administratorpasswort');
    }

    try {
      // Hole den ersten Laborraum (ältester zuerst)
      const mainRoom = await this.prisma.room.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      if (!mainRoom) {
        this.logger.error('Kein Laborraum gefunden.');
        throw new BadRequestException('Kein Laborraum gefunden.');
      }

      // Update the room capacity using the PrismaService directly
      await this.prisma.room.update({
        where: { id: mainRoom.id },
        data: { maxCapacity: capacity },
      });

      this.logger.debug(`Laborkapazität erfolgreich auf ${capacity} gesetzt`);
      
      // Sende Kapazitäts-Update via WebSocket an Frontend
      try {
        // Hole aktuelle Belegung und Türstatus für WebSocket-Event
        const currentOccupancy = mainRoom.capacity; // Aktuelle Belegung
        
        // Hole aktuellen Türstatus
        const latestDoorEvent = await this.prisma.doorEvent.findFirst({
          orderBy: { eventTimestamp: 'desc' },
        });
        const isOpen = latestDoorEvent?.doorIsOpen ?? true;

        // Sende WebSocket-Event mit neuer Kapazität
        await this.eventsGateway.sendCapacityUpdate(
          capacity, // neue maximale Kapazität
          currentOccupancy, // aktuelle Belegung
          isOpen, // Türstatus
        );
        
        this.logger.debug('WebSocket capacity update sent successfully');
      } catch (wsError) {
        this.logger.warn('Failed to send WebSocket capacity update:', wsError);
        // WebSocket-Fehler soll setLabCapacity nicht blockieren
      }

      return {
        success: true,
        message: `Laborkapazität erfolgreich auf ${capacity} gesetzt`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        'Fehler beim Setzen der Laborkapazität (Room)',
        errorStack || errorMessage,
      );
      throw error;
    }
  }

  /**
   * @method login
   * @description Login
   * @param password - Das Administratorpasswort
   * @returns {Promise<{ success: boolean; message: string }>} Ob der Login erfolgreich war und eine Nachricht
   */
  async login(password: string): Promise<{ success: boolean; message: string }> {
    this.logger.debug(`Login attempt with password`);

    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');
    if (password !== adminPassword) {
      this.logger.warn('Ungültiger Passwortversuch für login');
      throw new UnauthorizedException('Ungültiges Administratorpasswort');
    }

    this.logger.debug(`Login successfull`);

    return {
      success: true,
      message: 'Login erfolgreich',
    };
  }
}

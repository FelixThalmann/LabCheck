<<<<<<< Updated upstream
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
=======
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
>>>>>>> Stashed changes
import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DoorService } from '../../door/door/door.service';
import { 
  LabStatusResponseDto, 
  LabCapacityResponseDto, 
} from '../dto';
<<<<<<< Updated upstream
import { PrismaService } from 'src/prisma.service';
=======
import { PrismaService } from '../../prisma/prisma.service';
>>>>>>> Stashed changes

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
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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
    this.logger.debug('Sammle kombinierten Laborstatus (Kapazität direkt aus Room-Tabelle)');

    const currentTime = new Date();

    try {
      // Türstatus abrufen (nutzt bestehenden DoorService)
      const doorStatus = await this.doorService.getLatestDoorStatus();
      const isOpen = doorStatus?.isOpen ?? false;

      // Belegung abrufen (nutzt bestehenden DoorService)
      const occupancyData = await this.getLabCapacity();
      const currentOccupancy = occupancyData?.capacity ?? 0;

      // Kapazität direkt aus Room-Tabelle holen (erster aktiver Raum, ältester zuerst)
      const mainRoom = await this.prisma.room.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!mainRoom) {
        this.logger.error('Kein aktiver Laborraum gefunden.');
        throw new BadRequestException('Kein aktiver Laborraum gefunden.');
      }

      const maxOccupancy: number = mainRoom.maxCapacity;

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

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Fehler beim Sammeln des Laborstatus', errorStack || errorMessage);
      throw error;
    }
  }

  /**
   * @method getLabCapacity
   * @description Liefert die aktuelle Laborkapazität direkt aus der Room-Tabelle (maxCapacity des aktiven Raums)
   */
  async getLabCapacity(): Promise<LabCapacityResponseDto> {
    this.logger.debug('Hole aktuelle Laborkapazität direkt aus der Room-Tabelle');

    try {
      // Hole den aktiven Hauptlabor-Raum (z.B. isActive = true, ältester Raum)
      const mainRoom = await this.prisma.room.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!mainRoom) {
        this.logger.error('Kein aktiver Laborraum gefunden.');
        throw new BadRequestException('Kein aktiver Laborraum gefunden.');
      }

      return {
        capacity: mainRoom.capacity,
        lastUpdated: new Date().toISOString(),
      };
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
    this.logger.debug('Hole maxCapacity des aktiven Laborraums aus der Room-Tabelle');

    try {
      const mainRoom = await this.prisma.room.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!mainRoom) {
        this.logger.error('Kein aktiver Laborraum gefunden.');
        throw new BadRequestException('Kein aktiver Laborraum gefunden.');
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
<<<<<<< Updated upstream
   * @description Setzt die maxCapacity des aktiven Labor-Raums (Room) mit Passwort-Schutz.
   * Gibt nur die neue Kapazität zurück.
   */
  async setLabCapacity(
    capacity: number,
    password: string,
  ): Promise<number> {
    this.logger.debug(`Setze maxCapacity des Labors (Room) auf: ${capacity}`);

=======
   * @description Setzt die Laborkapazität mit Passwort-Schutz für einen spezifischen Raum
   * @param roomId - Die ID des Raums
   * @param capacity - Die neue Kapazität
   * @param password - Das Administratorpasswort
   */
  async setLabCapacity(roomId: string, capacity: number, password: string): Promise<Room> {
    this.logger.debug(`Setting lab capacity for room ${roomId} to: ${capacity}`);
    
>>>>>>> Stashed changes
    // Passwort-Validierung
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');
    if (password !== adminPassword) {
      this.logger.warn('Ungültiger Passwortversuch für setLabCapacity');
      throw new UnauthorizedException('Ungültiges Administratorpasswort');
    }

    try {
<<<<<<< Updated upstream
      // Hole den aktiven Hauptlabor-Raum (z.B. isActive = true, ältester Raum)
      const mainRoom = await this.prisma.room.findFirst({
        where: { isActive: true }, // vll mit der einzigen ID austyyyyyyauschen
        orderBy: { createdAt: 'asc' },
      });

      if (!mainRoom) {
        this.logger.error('Kein aktiver Laborraum gefunden.');
        throw new BadRequestException('Kein aktiver Laborraum gefunden.');
      }

      // Update the room capacity using the PrismaService directly
      await this.prisma.room.update({
        where: { id: mainRoom.id },
        data: { maxCapacity: capacity },
      });

      this.logger.debug(`Laborkapazität erfolgreich auf ${capacity} gesetzt`);
      return capacity;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        'Fehler beim Setzen der Laborkapazität (Room)',
        errorStack || errorMessage,
      );
=======
      const updatedRoom = await this.prisma.room.update({
        where: { id: roomId },
        data: { 
          maxCapacity: capacity,
          updatedAt: new Date()
        }
      });
      
      this.logger.debug(`Successfully updated room capacity for room ${roomId}`);
      return updatedRoom;
    } catch (error) {
      this.logger.error('Error setting room capacity', error.stack);
>>>>>>> Stashed changes
      throw error;
    }
  }
}

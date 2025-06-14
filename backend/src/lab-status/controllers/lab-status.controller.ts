/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Controller, Get, Post, Body, Logger, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { LabStatusService } from '../services/lab-status.service';
import { 
  LabStatusResponseDto, 
  LabCapacityResponseDto, 
  LabSettingResponseDto,
  SetLabCapacityDto 
} from '../dto';

/**
 * @class LabStatusController
 * @description Erweiterte REST Controller für Laborstatus-Endpunkte
 * Implementiert die API-Spezifikation für /api/lab/* mit vollständiger GraphQL-Migration
 */
@Controller('api/lab')
@ApiTags('Lab Status & Settings')
@ApiSecurity('api-key')
export class LabStatusController {
  private readonly logger = new Logger(LabStatusController.name);

  constructor(private readonly labStatusService: LabStatusService) {}

  /**
   * @method getLabStatus
   * @description Liefert den aktuellen Status und die Belegung des Labors
   * Entspricht GET /api/lab/status aus der API-Dokumentation
   */
  @Get('status')
  @ApiOperation({
    summary: 'Aktueller Laborstatus',
    description: 'Liefert den aktuellen Status und die Belegung des Labors',
  })
  @ApiResponse({
    status: 200,
    description: 'Laborstatus erfolgreich abgerufen',
    type: LabStatusResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Interner Server-Fehler',
  })
  async getLabStatus(): Promise<LabStatusResponseDto> {
    this.logger.debug('REST API: GET /api/lab/status');
    return this.labStatusService.getCombinedLabStatus();
  }

  /**
   * @method getLabCapacity
   * @description Liefert die aktuelle Laborkapazität
   * Entspricht der GraphQL labCapacity Query
   */
  @Get('capacity')
  @ApiOperation({
    summary: 'Aktuelle Laborkapazität abrufen',
    description: 'Liefert die aktuell konfigurierte Laborkapazität',
  })
  @ApiResponse({
    status: 200,
    description: 'Laborkapazität erfolgreich abgerufen',
    type: LabCapacityResponseDto,
  })
  async getLabCapacity(): Promise<LabCapacityResponseDto> {
    this.logger.debug('REST API: GET /api/lab/capacity');
    return this.labStatusService.getLabCapacity();
  }

  /**
   * @method setLabCapacity
   * @description Setzt die Laborkapazität mit Passwort-Schutz
   * Entspricht der GraphQL setLabCapacity Mutation mit zusätzlicher Sicherheit
   */
  @Post('capacity')
  @ApiOperation({
    summary: 'Laborkapazität setzen',
    description: 'Setzt die Laborkapazität mit Administratorpasswort-Schutz',
  })
  @ApiResponse({
    status: 200,
    description: 'Laborkapazität erfolgreich gesetzt',
    type: LabSettingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültige Eingabedaten',
  })
  @ApiResponse({
    status: 401,
    description: 'Ungültiges Administratorpasswort',
  })
  async setLabCapacity(
    @Body() setCapacityDto: SetLabCapacityDto,
  ): Promise<number> {
    this.logger.debug(`REST API: POST /api/lab/capacity - capacity: ${setCapacityDto.capacity}`);
    return this.labStatusService.setLabCapacity(
      setCapacityDto.capacity,
      setCapacityDto.password,
    );
  }

  /**
   * @method getRoomStatus
   * @description Prüft den Öffnungsstatus eines bestimmten Raums
   * @param roomId - Die ID des zu prüfenden Raums
   * @returns Promise<boolean> - true wenn der Raum offen ist, false wenn geschlossen
   */
  @Get('room/:roomId/status')
  @ApiOperation({
    summary: 'Raumstatus abrufen',
    description: 'Prüft, ob ein bestimmter Raum geöffnet ist',
  })
  @ApiResponse({
    status: 200,
    description: 'Raumstatus erfolgreich abgerufen',
    type: Boolean,
  })
  @ApiResponse({
    status: 404,
    description: 'Raum nicht gefunden',
  })
  async getRoomStatus(
    @Param('roomId') roomId: string,
  ): Promise<boolean> {
    this.logger.debug(`REST API: GET /api/lab/room/${roomId}/status`);
    return this.labStatusService.isRoomOpen(roomId);
  }
}

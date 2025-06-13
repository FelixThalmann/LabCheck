import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LabStatusResolver } from './lab-status.resolver';
import { LabStatusController } from './controllers/lab-status.controller';
import { LabStatusService } from './services/lab-status.service';
import { DoorModule } from '../door/door.module';
import { LabSettingsModule } from '../lab-settings/lab-settings.module';
import { OccupancyServicePlaceholder } from './lab-status.resolver';

/**
 * @class LabStatusModule
 * @description Erweiterte Modul für Lab-Status (GraphQL + REST)
 * Unterstützt sowohl GraphQL Resolver als auch REST Controller
 * Vollständige Migration von GraphQL zu REST API
 */
@Module({
  imports: [
    DoorModule, 
    LabSettingsModule,
    ConfigModule, // Für Passwort-Validierung
  ],
  controllers: [LabStatusController], // Erweitert für REST API
  providers: [
    LabStatusResolver, // Legacy GraphQL (kann später entfernt werden)
    LabStatusService, // Erweitert für REST API
    Logger,
    OccupancyServicePlaceholder, // Für Legacy-Kompatibilität
  ],
  exports: [LabStatusService],
})
export class LabStatusModule {}

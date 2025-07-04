import { Module, Logger, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LabStatusController } from './controllers/lab-status.controller';
import { LabStatusService } from './services/lab-status.service';
import { EventsModule } from '../events/events.module';
import { PrismaService } from '../prisma.service';
import { PredictionsModule } from '../predictions/predictions.module';


/**
 * @class LabStatusModule
 * @description Erweiterte Modul für Lab-Status (GraphQL + REST)
 * Unterstützt sowohl GraphQL Resolver als auch REST Controller
 * Vollständige Migration von GraphQL zu REST API
 */
@Module({
  imports: [
    ConfigModule, // Für Passwort-Validierung
    forwardRef(() => EventsModule), // Für EventsGateway Zugriff
    forwardRef(() => PredictionsModule), // Für HolidayService Zugriff
  ],
  controllers: [LabStatusController], // Erweitert für REST API
  providers: [
    LabStatusService, // Erweitert für REST API
    PrismaService, // Für Datenbankzugriff
    Logger,
  ],
  exports: [LabStatusService],
})
export class LabStatusModule {}

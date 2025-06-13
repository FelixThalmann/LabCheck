import { Module } from '@nestjs/common';
import { OccupancyService } from './services/occupancy.service';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module';

/**
 * @module OccupancyModule
 * @description Modul für die Verwaltung der Raumbelegung.
 * Stellt Services für die automatische Aktualisierung der Belegung
 * basierend auf Sensor-Events zur Verfügung.
 */
@Module({
  imports: [EventsModule],
  providers: [OccupancyService, PrismaService],
  exports: [OccupancyService],
})
export class OccupancyModule {}

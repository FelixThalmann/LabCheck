import { Module } from '@nestjs/common';
import { OccupancyService } from './services/occupancy.service';
import { RoomManagementService } from './services/room-management.service';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module';

/**
 * Module for managing room occupancy
 * Provides services for automatic occupancy updates based on sensor events
 */
@Module({
  imports: [EventsModule],
  providers: [OccupancyService, RoomManagementService, PrismaService],
  exports: [OccupancyService, RoomManagementService],
})
export class OccupancyModule {}

import { Module } from '@nestjs/common';
import { MqttIngestionService } from './mqtt-ingestion/mqtt-ingestion.service';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module';
import { OccupancyModule } from '../occupancy/occupancy.module';

/**
 * MQTT module for handling IoT device communication
 * Processes door events and motion events from hardware sensors
 */
@Module({
  imports: [EventsModule, OccupancyModule],
  providers: [MqttIngestionService, PrismaService],
  exports: [MqttIngestionService],
})
export class MqttModule {}

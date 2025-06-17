import { Module } from '@nestjs/common';
import { MqttIngestionService } from './mqtt-ingestion/mqtt-ingestion.service';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module';
import { OccupancyModule } from '../occupancy/occupancy.module';

@Module({
  imports: [EventsModule, OccupancyModule],
  providers: [MqttIngestionService, PrismaService],
  exports: [MqttIngestionService],
})
export class MqttModule {}

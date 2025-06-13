import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MqttIngestionService } from './mqtt-ingestion/mqtt-ingestion.service';
import { EventsModule } from '../events/events.module';
import { DoorModule } from '../door/door.module';
import { OccupancyModule } from '../occupancy/occupancy.module';

@Module({
  imports: [ConfigModule, EventsModule, DoorModule, OccupancyModule],
  providers: [MqttIngestionService],
  exports: [MqttIngestionService]
})
export class MqttModule {}

import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events/events.gateway';
import { LabStatusModule } from '../lab-status/lab-status.module';

/**
 * Events module for WebSocket communication
 * Provides real-time event broadcasting to connected clients
 */
@Module({
  imports: [forwardRef(() => LabStatusModule)],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}

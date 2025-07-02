import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events/events.gateway';
import { LabStatusModule } from '../lab-status/lab-status.module';

@Module({
  imports: [forwardRef(() => LabStatusModule)],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}

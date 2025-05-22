import { Module } from '@nestjs/common';
import { DoorService } from './door/door.service';
import { DoorResolver } from './door/door.resolver';
import { LabSettingsModule } from '../lab-settings/lab-settings.module';

@Module({
  imports: [LabSettingsModule],
  providers: [DoorService, DoorResolver],
  exports: [DoorService]
})
export class DoorModule {}

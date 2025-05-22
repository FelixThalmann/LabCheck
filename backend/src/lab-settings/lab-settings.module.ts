import { Module } from '@nestjs/common';
import { LabSettingsService } from './lab-settings.service';
import { LabSettingsResolver } from './lab-settings.resolver';

@Module({
  providers: [LabSettingsService, LabSettingsResolver],
  exports: [LabSettingsService],
})
export class LabSettingsModule {}

import { Module, Logger } from '@nestjs/common';
import { LabStatusResolver } from './lab-status.resolver';
import { DoorModule } from '../door/door.module'; // Pfad ggf. anpassen
import { LabSettingsModule } from '../lab-settings/lab-settings.module'; // Pfad ggf. anpassen
// Importieren Sie hier Ihr echtes OccupancyModule, sobald es existiert
// import { OccupancyModule } from '../occupancy/occupancy.module'; 
import { OccupancyServicePlaceholder } from './lab-status.resolver'; // Wird für den Placeholder benötigt

@Module({
  imports: [
    DoorModule, 
    LabSettingsModule,
    // OccupancyModule, // Einkommentieren, wenn Ihr echtes Modul bereit ist
  ],
  providers: [
    LabStatusResolver,
    Logger, // Optional, falls direkt im Resolver verwendet und nicht über this.logger
    // Stellen Sie OccupancyServicePlaceholder hier bereit, da er im LabStatusResolver injiziert wird.
    // Wenn Sie Ihren echten OccupancyService haben, der in einem eigenen Modul (z.B. OccupancyModule)
    // bereitgestellt und exportiert wird, dann müssen Sie hier nur das OccupancyModule importieren.
    OccupancyServicePlaceholder, 
  ],
})
export class LabStatusModule {} 
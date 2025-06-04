import { Resolver, Query, Args } from '@nestjs/graphql';
import { CombinedLabStatus } from './dto/combined-lab-status.dto';
import { DoorService } from '../door/door/door.service'; // Pfad anpassen, falls nötig
import { LabSettingsService } from '../lab-settings/lab-settings.service'; // Pfad anpassen, falls nötig
import { Injectable, Logger } from '@nestjs/common';

// --- OccupancyServicePlaceholder --- 
// Dies ist ein Platzhalter. Ersetzen Sie ihn durch Ihren echten OccupancyService.
@Injectable()
export class OccupancyServicePlaceholder {
  private readonly logger = new Logger(OccupancyServicePlaceholder.name);
  async getCurrentOccupancy(sensorId?: string): Promise<{ currentOccupancy: number; timestamp: Date } | null> {
    this.logger.warn(`OccupancyServicePlaceholder.getCurrentOccupancy CALLED with sensorId: ${sensorId}. Returning DUMMY data.`);
    // Hier würden Sie die echte Logik implementieren, um die Belegung aus PassageEvents zu ermitteln.
    // Beispiel: Aggregieren von IN/OUT Events.
    return { currentOccupancy: 0, timestamp: new Date() }; // Dummy-Wert für jetzt
  }
}
// --- Ende OccupancyServicePlaceholder ---

@Resolver(() => CombinedLabStatus)
export class LabStatusResolver {
  private readonly logger = new Logger(LabStatusResolver.name);

  constructor(
    private doorService: DoorService,
    private occupancyService: OccupancyServicePlaceholder, // HIER IHREN ECHTEN OccupancyService INJIZIEREN
    private labSettingsService: LabSettingsService,
  ) {}

  @Query(() => CombinedLabStatus, { name: 'combinedLabStatus' })
  async getCombinedLabStatus(
  ): Promise<CombinedLabStatus> {
    this.logger.log(`Resolving combinedLabStatus`);
    const currentTime = new Date();

    // 1. Türstatus abrufen
    // Annahme: doorService.getLatestDoorStatus existiert und liefert { isOpen: boolean; timestamp: Date } | null
    const doorStatus = await this.doorService.getLatestDoorStatus();
    const isOpen = doorStatus?.isOpen ?? false; // Nullish coalescing für Standardwert

    // 2. Belegung und Kapazität
    const occupancyData = await this.occupancyService.getCurrentOccupancy(/* hier könnte eine spezifische Sensor-ID für Belegung stehen */);
    const currentOccupancy = occupancyData?.currentOccupancy ?? 0;
    
    // Korrektur hier: getLabCapacity() anstelle von getLabCapacityValue()
    const maxOccupancy = await this.labSettingsService.getLabCapacity() ?? 0; // Standardwert 0 falls Kapazität nicht gesetzt

    // 3. Farbe berechnen
    let color = 'green'; // Standardfarbe
    if (maxOccupancy > 0) {
      const occupancyPercentage = (currentOccupancy / maxOccupancy) * 100;
      if (occupancyPercentage >= 90) {
        color = 'red';
      } else if (occupancyPercentage >= 70) {
        color = 'yellow';
      }
    } else if (currentOccupancy > 0) { // Keine Kapazität definiert, aber Personen anwesend
      color = 'red'; 
    }
    
    this.logger.log(`Resolved data: isOpen= ${isOpen}, current=${currentOccupancy}, max=${maxOccupancy}, color=${color}`);

    return {
      isOpen,
      currentOccupancy,
      maxOccupancy,
      color,
      currentDate: currentTime,
      lastUpdated: currentTime, // Für dieses Beispiel verwenden wir currentTime; Sie könnten hier den neuesten Zeitstempel Ihrer Datenquellen verwenden
    };
  }
} 
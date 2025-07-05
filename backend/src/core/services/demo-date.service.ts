import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * @class DemoDateService
 * @description Zentraler Service für Demo-Modus Datum und Zeitstempel
 * Stellt konsistente Demo-Datum-Funktionalität für alle Services bereit
 */
@Injectable()
export class DemoDateService {
  private readonly logger = new Logger(DemoDateService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * @method getCurrentDate
   * @description Gibt das aktuelle Datum oder Demo-Datum zurück basierend auf DEMO_MODE und der aktuellen Zeit
   * @returns Date - Aktuelles Datum oder Demo-Datum
   */
  getCurrentDate(): Date {
    const isDemoMode = this.configService.get<boolean>('DEMO_MODE', false);
    

    if (isDemoMode) {
      const demoDay = this.configService.get<string>('DEMO_DAY');
      if (demoDay) {
        const demoDate = new Date(demoDay);
        const currentDate = new Date();

        // Take the date from the demoDay and set the time to the current time
        const demoDateWithCurrentTime = new Date(demoDate);
        demoDateWithCurrentTime.setHours(currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds(), currentDate.getMilliseconds());

        if (!isNaN(demoDate.getTime())) {
          this.logger.debug(`Demo mode active, using demo date: ${demoDateWithCurrentTime}`);
          return demoDateWithCurrentTime;
        } else {
          this.logger.warn(`Invalid DEMO_DAY format: ${demoDay}, falling back to current date`);
        }
      } else {
        this.logger.warn('DEMO_MODE is true but DEMO_DAY is not set, falling back to current date');
      }
    }
    
    return new Date();
  }

  /**
   * @method getCurrentTimestamp
   * @description Gibt den aktuellen Zeitstempel oder Demo-Zeitstempel zurück basierend auf DEMO_MODE
   * @returns string - Aktueller Zeitstempel oder Demo-Zeitstempel im ISO-Format
   */
  getCurrentTimestamp(): string {
    return this.getCurrentDate().toISOString();
  }

  /**
   * @method isDemoMode
   * @description Prüft, ob der Demo-Modus aktiv ist
   * @returns boolean - true wenn Demo-Modus aktiv, false sonst
   */
  isDemoMode(): boolean {
    return this.configService.get<boolean>('DEMO_MODE', false);
  }

  /**
   * @method getDemoDay
   * @description Gibt das konfigurierte Demo-Datum zurück
   * @returns string | undefined - Demo-Datum oder undefined
   */
  getDemoDay(): string | undefined {
    return this.configService.get<string>('DEMO_DAY');
  }
} 
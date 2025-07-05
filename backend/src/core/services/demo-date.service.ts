import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Central service for demo mode date and timestamp functionality
 * Provides consistent demo date functionality for all services
 */
@Injectable()
export class DemoDateService {
  private readonly logger = new Logger(DemoDateService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Returns current date or demo date based on DEMO_MODE and current time
   * @returns Date - Current date or demo date
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
   * Returns current timestamp or demo timestamp based on DEMO_MODE
   * @returns string - Current timestamp or demo timestamp in ISO format
   */
  getCurrentTimestamp(): string {
    return this.getCurrentDate().toISOString();
  }

  /**
   * Checks if demo mode is active
   * @returns boolean - true if demo mode is active, false otherwise
   */
  isDemoMode(): boolean {
    return this.configService.get<boolean>('DEMO_MODE', false);
  }

  /**
   * Returns the configured demo date
   * @returns string | undefined - Demo date or undefined
   */
  getDemoDay(): string | undefined {
    return this.configService.get<string>('DEMO_DAY');
  }
} 
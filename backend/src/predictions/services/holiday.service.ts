import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface Holiday {
  date: string;
  fname: string;
  all_states: string;
  nw: string;
  [key: string]: string | null;
}

interface HolidayApiResponse {
  status: string;
  feiertage: Holiday[];
}

@Injectable()
export class HolidayService {
  private readonly logger = new Logger(HolidayService.name);
  private holidaysCache: Map<string, boolean> = new Map();
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden

  /**
   * @method isHoliday
   * @description Prüft, ob ein Datum ein Feiertag in NRW ist
   * @param date - Das zu prüfende Datum
   * @returns true wenn es ein Feiertag ist, false sonst
   */
  async isHoliday(date: Date): Promise<boolean> {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD Format
    
    // Prüfe Cache zuerst
    if (this.holidaysCache.has(dateString)) {
      return this.holidaysCache.get(dateString)!;
    }

    // Cache aktualisieren wenn nötig
    await this.updateHolidaysCacheIfNeeded();

    // Prüfe erneut im Cache
    if (this.holidaysCache.has(dateString)) {
      return this.holidaysCache.get(dateString)!;
    }

    return false;
  }

  /**
   * @method updateHolidaysCacheIfNeeded
   * @description Aktualisiert den Feiertags-Cache wenn er abgelaufen ist
   */
  private async updateHolidaysCacheIfNeeded(): Promise<void> {
    const now = new Date();
    
    if (this.lastCacheUpdate && 
        (now.getTime() - this.lastCacheUpdate.getTime()) < this.CACHE_DURATION) {
      return; // Cache ist noch gültig
    }

    try {
      this.logger.debug('Updating holidays cache');
      
      const response = await axios.get<HolidayApiResponse>(
        'https://get.api-feiertage.de/?states=nw',
        { timeout: 10000 }
      );

      if (response.data.status === 'success') {
        this.holidaysCache.clear();
        
        // Füge alle Feiertage zum Cache hinzu
        response.data.feiertage.forEach(holiday => {
          if (holiday.nw === '1') { // Nur NRW-Feiertage
            this.holidaysCache.set(holiday.date, true);
          }
        });

        this.lastCacheUpdate = now;
        this.logger.debug(`Cached ${this.holidaysCache.size} holidays for NRW`);
      } else {
        this.logger.warn('Holiday API returned unsuccessful status');
      }
    } catch (error) {
      this.logger.error('Failed to fetch holidays from API', error.stack);
      // Bei Fehlern verwenden wir den bestehenden Cache oder leeren Cache
      if (!this.lastCacheUpdate) {
        this.holidaysCache.clear();
      }
    }
  }

  /**
   * @method clearCache
   * @description Löscht den Feiertags-Cache (für Tests oder manuelle Updates)
   */
  clearCache(): void {
    this.holidaysCache.clear();
    this.lastCacheUpdate = null;
    this.logger.debug('Holidays cache cleared');
  }
} 
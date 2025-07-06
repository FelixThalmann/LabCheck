import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DemoDateService } from '../../core/services/demo-date.service';
import { PredictionApiService } from './prediction-api.service';
import { HolidayService } from './holiday.service';
import {
  DayPredictionResponseDto,
  ExtendedWeekPredictionResponseDto,
  WeekPredictionItemDto,
  PredictionRequestDto,
  SinglePredictionResponseDto,
} from '../dto';

/**
 * @class PredictionsService
 * @description Service für Vorhersage-Geschäftslogik
 * Verwaltet Tages- und Wochenvorhersagen
 */
@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    private readonly prisma: PrismaService, 
    private readonly predictionApiService: PredictionApiService,
    private readonly holidayService: HolidayService,
    private readonly demoDateService: DemoDateService,
  ) {}

  /**
   * @method getDayPredictions
   * @description Liefert ML-basierte Tagesvorhersagen
   * Generiert Vorhersagen von 8:00 bis 18:00 alle 2 Stunden und speichert sie in der Datenbank
   * @param dateString Optionales Datum im Format YYYY-MM-DD
   */
  async getDayPredictions(
    dateString?: string,
  ): Promise<DayPredictionResponseDto> {
    this.logger.debug(
      `Fetching ML-based day predictions for ${dateString || 'today'}`,
    );

    try {
      const date = dateString ? new Date(dateString) : this.demoDateService.getCurrentDate();
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided');
      }

      // Check if there is weekend (Saturday or Sunday) or holiday (by default, the room is closed)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isHoliday = await this.holidayService.isHoliday(date);
      
      if (isWeekend || isHoliday) {
        const reason = isWeekend ? 'weekend' : 'holiday';
        this.logger.debug(`Room is closed on ${reason}, returning default closed predictions`);
        const timeSlots = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];
        return {
          predictions: timeSlots.map(time => ({
            occupancy: 0,
            time,
            color: 'red',
          })),
          lastUpdated: this.demoDateService.getCurrentTimestamp(),
        };
      }

      // Check if there are already predictions for this date
      const existingPredictions = await this.prisma.dayPrediction.findMany({
        where: {
          date: date,
        },
      });

      if (existingPredictions.length > 0) {
        this.logger.debug('Predictions already exist for this date, skipping generation');
        return {
          predictions: existingPredictions.map((p) => ({
            occupancy: p.occupancy,
            time: p.time,
            color: p.color,
          })),
          lastUpdated: this.demoDateService.getCurrentTimestamp(),
        };
      }

      // Generate new predictions
      const predictions = await this.generateMLDayPredictions(date);
          
      // Speichere Vorhersagen in der Datenbank
      await this.saveDayPredictions(predictions, date);

      return {
        predictions: predictions.map((p) => ({
          occupancy: p.occupancy,
          time: p.time,
          color: p.color,
        })),
        lastUpdated: this.demoDateService.getCurrentTimestamp(),
      };
    } catch (error) {
      this.logger.error('Error fetching ML day predictions', error.stack);
      throw error;
    }
  }

  /**
   * @method getWeekPredictions
   * @description Liefert erweiterte ML-basierte Wochenvorhersagen für aktuelle und nächste Woche
   * Generiert Durchschnittswerte basierend auf ML-Tagesvorhersagen und speichert sie in der Datenbank
   */
  async getWeekPredictions(): Promise<ExtendedWeekPredictionResponseDto> {
    this.logger.debug('Fetching extended ML-based week predictions');
    
    try {
      const currentWeekRange = this.getCurrentWeekRange();
      const nextWeekRange = this.getNextWeekRange();

      // Check if there are already predictions for this and next week
      const existingCurrentWeekPredictions = await this.prisma.weekPrediction.findMany({
        where: {
          weekStart: {
            gte: currentWeekRange.start,
            lte: currentWeekRange.end,
          },
        },
      });

      const existingNextWeekPredictions = await this.prisma.weekPrediction.findMany({
        where: {
          weekStart: {
            gte: nextWeekRange.start,
            lte: nextWeekRange.end,
          },
        },
      });

      if (existingCurrentWeekPredictions.length > 0 && existingNextWeekPredictions.length > 0) {
        this.logger.debug('Predictions already exist for the current week, skipping generation');
        return {
          currentWeek: existingCurrentWeekPredictions.map((p) => ({
            occupancy: p.occupancy,
            day: p.day,
            color: p.color,
            date: p.weekStart.toISOString().split('T')[0],
          })),
          nextWeek: existingNextWeekPredictions.map((p) => ({
            occupancy: p.occupancy,
            day: p.day,
            color: p.color,
            date: p.weekStart.toISOString().split('T')[0],
          })),
          lastUpdated: this.demoDateService.getCurrentTimestamp(),
        };
      }

      // Generiere Vorhersagen für beide Wochen parallel
      const [currentWeekPredictions, nextWeekPredictions] = await Promise.all([
        this.generateMLWeekPredictionsForRange(currentWeekRange.start, 'current'),
        this.generateMLWeekPredictionsForRange(nextWeekRange.start, 'next'),
      ]);
      
      // Speichere Vorhersagen in der Datenbank
      await Promise.all([
        this.saveWeekPredictions(currentWeekPredictions, currentWeekRange.start),
        this.saveWeekPredictions(nextWeekPredictions, nextWeekRange.start),
      ]);
      
      return {
        currentWeek: currentWeekPredictions,
        nextWeek: nextWeekPredictions,
        lastUpdated: this.demoDateService.getCurrentTimestamp(),
      };
      
    } catch (error) {
      this.logger.error('Error fetching extended ML week predictions', error);
      throw error;
    }
  }

  /**
   * @method getSinglePrediction
   * @description Liefert eine einzelne ML-Vorhersage für einen spezifischen Zeitpunkt
   * Ruft den FastAPI ML-Service auf und transformiert die Antwort
   */
  async getSinglePrediction(
    request: PredictionRequestDto,
  ): Promise<SinglePredictionResponseDto> {
    this.logger.debug(`Getting single prediction for ${request.timestamp}`);

    try {
      // Rufe FastAPI ML-Service auf
      const mlResponse = await this.predictionApiService.getSinglePrediction(request);

      // Transformiere die Antwort für das Frontend
      const occupancy = Math.round(mlResponse.predicted_occupancy);
      const color = await this.calculateColorFromOccupancy(occupancy);

      return {
        predictedOccupancy: occupancy,
        isDoorOpen: mlResponse.prediction_isDoorOpen,
        predictionTimestamp: mlResponse.prediction_for_timestamp,
        color,
        lastTrainedAt: mlResponse.last_trained_at,
        responseTimestamp: this.demoDateService.getCurrentTimestamp(),
      };
    } catch (error) {
      this.logger.error(
        `Error getting single prediction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * @method calculateColorFromOccupancy
   * @description Berechnet Farbkodierung basierend auf Belegung.
   * Die Kapazität wird aus der Datenbank vom Standard-Raum bezogen.
   * @param occupancy - Die aktuelle oder vorhergesagte Belegung
   * @returns Farb-String (green, yellow, red)
   */
  private async calculateColorFromOccupancy(occupancy: number): Promise<string> {
    const room = await this.getDefaultRoom();
    const capacity = room.maxCapacity;

    if (capacity <= 0) {
      return 'red'; // Fallback, falls Kapazität nicht positiv ist
    }

    const percentage = (occupancy / capacity) * 100;

    if (percentage >= 90) return 'red';
    if (percentage >= 50) return 'yellow';
    return 'green';
  }

  /**
   * @method getDefaultRoom
   * @description Holt den Standard-Raum oder erstellt einen falls keiner existiert
   */
  private async getDefaultRoom() {
    let room = await this.prisma.room.findFirst({
      where: { isOpen: true },
    });
    
    if (!room) {
      this.logger.log('No active room found, creating default room');
      room = await this.prisma.room.create({
        data: {
          name: 'LabCheck-Main-Room',
          description: 'Standard-Laborraum',
          capacity: 20,
          isOpen: true,
        },
      });
    }
    
    return room;
  }

  /**
   * @method getWeekStart
   * @description Berechnet den Montag der aktuellen Woche
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Montag als Wochenstart
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * @method getCurrentWeekRange
   * @description Berechnet Start- und Enddatum der aktuellen Woche (Montag-Freitag)
   */
  private getCurrentWeekRange(): { start: Date; end: Date } {
    const now = this.demoDateService.getCurrentDate();
    const currentWeekStart = this.getWeekStart(now);
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 4); // Freitag
    return { start: currentWeekStart, end: currentWeekEnd };
  }

  /**
   * @method getNextWeekRange
   * @description Berechnet Start- und Enddatum der nächsten Woche (Montag-Freitag)
   */
  private getNextWeekRange(): { start: Date; end: Date } {
    const currentWeek = this.getCurrentWeekRange();
    const nextWeekStart = new Date(currentWeek.start);
    nextWeekStart.setDate(currentWeek.start.getDate() + 7);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 4);
    return { start: nextWeekStart, end: nextWeekEnd };
  }

  /**
   * @method generateMLWeekPredictionsForRange
   * @description Generiert ML-basierte Wochenvorhersagen für eine spezifische Woche
   * @param weekStart - Startdatum der Woche (Montag)
   * @param weekLabel - Label für Logging (z.B. 'current' oder 'next')
   * @returns Array von erweiterten Wochenvorhersagen mit Datum
   */
  private async generateMLWeekPredictionsForRange(
    weekStart: Date,
    weekLabel: string,
  ): Promise<WeekPredictionItemDto[]> {
    const predictions: WeekPredictionItemDto[] = [];
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    this.logger.debug(`Generating ML week predictions for ${weekLabel} week`);

    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + dayIndex);

      // Überspringe Wochenenden und Feiertage (sollte nicht auftreten, aber Sicherheitscheck)
      const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;
      const isHoliday = await this.holidayService.isHoliday(currentDay);
      
      if (isWeekend || isHoliday) {
        const reason = isWeekend ? 'weekend' : 'holiday';
        this.logger.debug(`Skipping ${reason} day ${dayIndex} in ${weekLabel} week`);
        continue;
      }

      try {
        const dayPredictions = await this.generateMLDayPredictions(currentDay);
        const averageOccupancy = Math.round(
          dayPredictions.reduce((sum, pred) => sum + pred.occupancy, 0) /
            dayPredictions.length,
        );

        predictions.push({
          occupancy: averageOccupancy,
          day: daysOfWeek[dayIndex],
          color: await this.calculateColorFromOccupancy(averageOccupancy),
          date: currentDay.toISOString().split('T')[0], // YYYY-MM-DD Format
        });
      } catch (error) {
        this.logger.warn(
          `Error generating predictions for day ${dayIndex} in ${weekLabel} week: ${error}`,
        );

        // Fallback für einzelne Tage
        predictions.push({
          occupancy: Math.floor(Math.random() * 8) + 1,
          day: daysOfWeek[dayIndex],
          color: 'yellow',
          date: currentDay.toISOString().split('T')[0],
        });
      }
    }

    return predictions;
  }

  /**
   * @method generateMLDayPredictions
   * @description Generiert ML-basierte Tagesvorhersagen von 8:00 bis 18:00 alle 2 Stunden
   * @param date - Datum für die Vorhersagen
   * @returns Array von Vorhersagen mit Durchschnittswerten
   */
  private async generateMLDayPredictions(date: Date): Promise<Array<{
    occupancy: number;
    time: string;
    color: string;
  }>> {
    const timeSlots = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];
    const timestamps: string[] = [];
    
    // Erstelle Zeitstempel für alle 2-Stunden-Intervalle
    for (let hour = 8; hour <= 18; hour += 2) {
      const timestamp = new Date(date);
      timestamp.setHours(hour, 0, 0, 0);
      timestamps.push(timestamp.toISOString());
    }

    this.logger.debug(`Generating ML predictions for ${timestamps.length} time slots`);

    try {
      // Hole ML-Vorhersagen für alle Zeitpunkte
      const mlPredictions = await this.predictionApiService.getMultiplePredictions(timestamps);
      
      // Transformiere zu gewünschtem Format
      return Promise.all(
        timeSlots.map(async (timeSlot, index) => {
          const mlPrediction = mlPredictions[index];
          const occupancy = Math.round(mlPrediction?.predicted_occupancy || 0);
          const color = await this.calculateColorFromOccupancy(occupancy);

          return {
            occupancy,
            time: timeSlot,
            color,
          };
        }),
      );
    } catch (error) {
      this.logger.error(`Error generating ML day predictions: ${error.message}`);
      
      // Fallback: Statische Vorhersagen bei ML-Service Problemen
      return timeSlots.map(timeSlot => ({
        occupancy: Math.floor(Math.random() * 10) + 1,
        time: timeSlot,
        color: 'yellow',
      }));
    }
  }

  /**
   * @method saveDayPredictions
   * @description Speichert Tagesvorhersagen in der Datenbank (upsert)
   * @param predictions - Array von Tagesvorhersagen
   * @param date - Datum für das die Vorhersagen gelten
   */
  private async saveDayPredictions(
    predictions: Array<{ occupancy: number; time: string; color: string }>,
    date: Date,
  ): Promise<void> {
    try {
      const room = await this.getDefaultRoom();
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);

      this.logger.debug(`Saving ${predictions.length} day predictions for ${normalizedDate.toISOString()}`);

      // Verwende Prisma Transaction für atomare Operationen
      await this.prisma.$transaction(async (prisma) => {
        for (const prediction of predictions) {
          await prisma.dayPrediction.upsert({
            where: {
              roomId_date_time: {
                roomId: room.id,
                date: normalizedDate,
                time: prediction.time,
              },
            },
            update: {
              occupancy: prediction.occupancy,
              color: prediction.color,
              confidence: 0.8, // Standard-Konfidenz für ML-Vorhersagen
            },
            create: {
              roomId: room.id,
              time: prediction.time,
              occupancy: prediction.occupancy,
              color: prediction.color,
              date: normalizedDate,
              confidence: 0.8,
            },
          });
        }
      });

      this.logger.debug('Day predictions saved successfully');
    } catch (error) {
      this.logger.error(`Error saving day predictions: ${error.message}`, error.stack);
      // Fehler beim Speichern soll die API-Antwort nicht blockieren
    }
  }

  /**
   * @method saveWeekPredictions
   * @description Speichert Wochenvorhersagen in der Datenbank (upsert)
   * @param predictions - Array von Wochenvorhersagen mit Datum
   * @param weekStart - Startdatum der Woche (Montag)
   */
  private async saveWeekPredictions(
    predictions: WeekPredictionItemDto[],
    weekStart: Date,
  ): Promise<void> {
    try {
      const room = await this.getDefaultRoom();
      const normalizedWeekStart = new Date(weekStart);
      normalizedWeekStart.setHours(0, 0, 0, 0);

      this.logger.debug(`Saving ${predictions.length} week predictions for week starting ${normalizedWeekStart.toISOString()}`);

      // Verwende Prisma Transaction für atomare Operationen
      await this.prisma.$transaction(async (prisma) => {
        for (const prediction of predictions) {
          await prisma.weekPrediction.upsert({
            where: {
              roomId_weekStart_day: {
                roomId: room.id,
                weekStart: normalizedWeekStart,
                day: prediction.day,
              },
            },
            update: {
              occupancy: prediction.occupancy,
              color: prediction.color,
              confidence: 0.8, // Standard-Konfidenz für ML-Vorhersagen
            },
            create: {
              roomId: room.id,
              day: prediction.day,
              occupancy: prediction.occupancy,
              color: prediction.color,
              weekStart: normalizedWeekStart,
              confidence: 0.8,
            },
          });
        }
      });

      this.logger.debug('Week predictions saved successfully');
    } catch (error) {
      this.logger.error(`Error saving week predictions: ${error.message}`, error.stack);
      // Fehler beim Speichern soll die API-Antwort nicht blockieren
    }
  }
}

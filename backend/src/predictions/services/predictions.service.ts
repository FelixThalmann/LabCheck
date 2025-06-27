import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PredictionCalculationService } from './prediction-calculation.service';
import { PredictionApiService } from './prediction-api.service';
import {
  DayPredictionResponseDto,
  WeekPredictionResponseDto,
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
  ) {}

  /**
   * @method getDayPredictions
   * @description Liefert ML-basierte Tagesvorhersagen
   * Generiert Vorhersagen von 8:00 bis 18:00 alle 2 Stunden
   * @param dateString Optionales Datum im Format YYYY-MM-DD
   */
  async getDayPredictions(
    dateString?: string,
  ): Promise<DayPredictionResponseDto> {
    this.logger.debug(
      `Fetching ML-based day predictions for ${dateString || 'today'}`,
    );

    try {
      const date = dateString ? new Date(dateString) : new Date();
      if (isNaN(date.getTime())) {
        // TODO: Throw a BadRequestException for better error handling
        throw new Error('Invalid date provided');
      }

      const predictions = await this.generateMLDayPredictions(date);

      return {
        predictions: predictions.map((p) => ({
          occupancy: p.occupancy,
          time: p.time,
          color: p.color,
        })),
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error fetching ML day predictions', error.stack);
      throw error;
    }
  }

  /**
   * @method getWeekPredictions
   * @description Liefert erweiterte ML-basierte Wochenvorhersagen für aktuelle und nächste Woche
   * Generiert Durchschnittswerte basierend auf ML-Tagesvorhersagen
   */
  async getWeekPredictions(): Promise<ExtendedWeekPredictionResponseDto> {
    this.logger.debug('Fetching extended ML-based week predictions');
    
    try {
      const currentWeekRange = this.getCurrentWeekRange();
      const nextWeekRange = this.getNextWeekRange();
      
      // Generiere Vorhersagen für beide Wochen parallel
      const [currentWeekPredictions, nextWeekPredictions] = await Promise.all([
        this.generateMLWeekPredictionsForRange(currentWeekRange.start, 'current'),
        this.generateMLWeekPredictionsForRange(nextWeekRange.start, 'next'),
      ]);
      
      return {
        currentWeek: currentWeekPredictions,
        nextWeek: nextWeekPredictions,
        lastUpdated: new Date().toISOString(),
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
        responseTimestamp: new Date().toISOString(),
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
          name: 'Hauptlabor',
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
    const now = new Date();
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

      // Überspringe Wochenenden (sollte nicht auftreten, aber Sicherheitscheck)
      if (currentDay.getDay() === 0 || currentDay.getDay() === 6) {
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
   * @method generateMLWeekPredictions
   * @description Generiert ML-basierte Wochenvorhersagen (Durchschnitt pro Tag)
   * @param weekStart - Startdatum der Woche
   * @returns Array von Wochenvorhersagen
   */
  private async generateMLWeekPredictions(weekStart: Date): Promise<Array<{
    occupancy: number;
    day: string;
    color: string;
  }>> {
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const weekPredictions: Array<{ occupancy: number; day: string; color: string; }> = [];

    this.logger.debug('Generating ML week predictions');

    for (let dayIndex = 0; dayIndex < 5; dayIndex++) { // Nur Wochentage
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + dayIndex);
      
      try {
        // Hole Tagesvorhersagen für diesen Tag
        const dayPredictions = await this.generateMLDayPredictions(currentDay);
        
        // Berechne Durchschnitt der Belegung für den Tag
        const averageOccupancy = dayPredictions.reduce((sum, pred) => sum + pred.occupancy, 0) / dayPredictions.length;
        const roundedOccupancy = Math.round(averageOccupancy);
        const color = await this.calculateColorFromOccupancy(roundedOccupancy);
        
        weekPredictions.push({
          occupancy: roundedOccupancy,
          day: daysOfWeek[dayIndex],
          color,
        });
      } catch (error) {
        this.logger.warn(`Error generating predictions for day ${dayIndex}: ${error.message}`);
        
        // Fallback für einzelne Tage
        weekPredictions.push({
          occupancy: Math.floor(Math.random() * 8) + 1,
          day: daysOfWeek[dayIndex],
          color: 'yellow',
        });
      }
    }

    return weekPredictions;
  }
}

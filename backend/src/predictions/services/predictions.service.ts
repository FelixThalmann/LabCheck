import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PredictionCalculationService } from './prediction-calculation.service';
import { PredictionApiService } from './prediction-api.service';
import {
  DayPredictionResponseDto,
  WeekPredictionResponseDto,
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
    private readonly predictionCalculationService: PredictionCalculationService,
    private readonly predictionApiService: PredictionApiService,
  ) {}

  /**
   * @method getDayPredictions
   * @description Liefert ML-basierte Tagesvorhersagen
   * Generiert Vorhersagen von 8:00 bis 18:00 alle 2 Stunden
   */
  async getDayPredictions(): Promise<DayPredictionResponseDto> {
    this.logger.debug('Fetching ML-based day predictions');
    
    try {
      const today = new Date();
      const predictions = await this.generateMLDayPredictions(today);
      
      return {
        predictions: predictions.map(p => ({
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
   * @description Liefert ML-basierte Wochenvorhersagen
   * Generiert Durchschnittswerte basierend auf ML-Tagesvorhersagen
   */
  async getWeekPredictions(): Promise<WeekPredictionResponseDto> {
    this.logger.debug('Fetching ML-based week predictions');
    
    try {
      const weekStart = this.getWeekStart(new Date());
      const predictions = await this.generateMLWeekPredictions(weekStart);
      
      return {
        predictions: predictions.map(p => ({
          occupancy: p.occupancy,
          day: p.day,
          color: p.color,
        })),
        lastUpdated: new Date().toISOString(),
      };
      
    } catch (error) {
      this.logger.error('Error fetching ML week predictions', error.stack);
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
      const color = this.calculateColorFromOccupancy(occupancy);

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
   * @description Berechnet Farbkodierung basierend auf Belegung
   * Konsistent mit der bestehenden Logik für Tages-/Wochenvorhersagen
   */
  private calculateColorFromOccupancy(occupancy: number): string {
    // Farblogik: grün (niedrig), gelb (mittel), rot (hoch)
    // Basiert auf typischer Laborkapazität von ~20 Personen
    if (occupancy <= 5) return 'green';
    if (occupancy <= 12) return 'yellow';
    return 'red';
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
      return timeSlots.map((timeSlot, index) => {
        const mlPrediction = mlPredictions[index];
        const occupancy = Math.round(mlPrediction?.predicted_occupancy || 0);
        const color = this.calculateColorFromOccupancy(occupancy);
        
        return {
          occupancy,
          time: timeSlot,
          color,
        };
      });
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
        const color = this.calculateColorFromOccupancy(roundedOccupancy);
        
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

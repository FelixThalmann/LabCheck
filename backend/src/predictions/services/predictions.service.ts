import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PredictionCalculationService } from './prediction-calculation.service';
import { DayPredictionResponseDto, WeekPredictionResponseDto } from '../dto';

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
  ) {}

  /**
   * @method getDayPredictions
   * @description Liefert Tagesvorhersagen
   * Generiert neue Vorhersagen falls keine vorhanden
   */
  async getDayPredictions(): Promise<DayPredictionResponseDto> {
    this.logger.debug('Fetching day predictions');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      // Hole den Standard-Raum (falls kein spezifischer Raum angegeben)
      const defaultRoom = await this.getDefaultRoom();
      
      // Versuche vorhandene Vorhersagen zu finden
      let predictions = await this.prisma.dayPrediction.findMany({
        where: { 
          date: today,
          roomId: defaultRoom.id,
        },
        orderBy: { time: 'asc' },
      });
      
      // Falls keine Vorhersagen vorhanden, generiere neue
      if (predictions.length === 0) {
        this.logger.debug('No existing day predictions found, generating new ones');
        predictions = await this.predictionCalculationService.generateDayPredictions(
          today,
          defaultRoom.id,
        );
      }
      
      return {
        predictions: predictions.map(p => ({
          occupancy: p.occupancy,
          time: p.time,
          color: p.color,
        })),
        lastUpdated: new Date().toISOString(),
      };
      
    } catch (error) {
      this.logger.error('Error fetching day predictions', error.stack);
      throw error;
    }
  }

  /**
   * @method getWeekPredictions
   * @description Liefert Wochenvorhersagen
   * Generiert neue Vorhersagen falls keine vorhanden
   */
  async getWeekPredictions(): Promise<WeekPredictionResponseDto> {
    this.logger.debug('Fetching week predictions');
    
    const weekStart = this.getWeekStart(new Date());
    
    try {
      // Hole den Standard-Raum
      const defaultRoom = await this.getDefaultRoom();
      
      // Versuche vorhandene Vorhersagen zu finden
      let predictions = await this.prisma.weekPrediction.findMany({
        where: { 
          weekStart,
          roomId: defaultRoom.id,
        },
        orderBy: { day: 'asc' },
      });
      
      // Falls keine Vorhersagen vorhanden, generiere neue
      if (predictions.length === 0) {
        this.logger.debug('No existing week predictions found, generating new ones');
        predictions = await this.predictionCalculationService.generateWeekPredictions(
          weekStart,
          defaultRoom.id,
        );
      }
      
      return {
        predictions: predictions.map(p => ({
          occupancy: p.occupancy,
          day: p.day,
          color: p.color,
        })),
        lastUpdated: new Date().toISOString(),
      };
      
    } catch (error) {
      this.logger.error('Error fetching week predictions', error.stack);
      throw error;
    }
  }

  /**
   * @method getDefaultRoom
   * @description Holt den Standard-Raum oder erstellt einen falls keiner existiert
   */
  private async getDefaultRoom() {
    let room = await this.prisma.room.findFirst({
      where: { isActive: true },
    });
    
    if (!room) {
      this.logger.log('No active room found, creating default room');
      room = await this.prisma.room.create({
        data: {
          name: 'Hauptlabor',
          description: 'Standard-Laborraum',
          capacity: 20,
          isActive: true,
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
}

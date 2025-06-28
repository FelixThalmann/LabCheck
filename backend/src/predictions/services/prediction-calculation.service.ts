import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

/**
 * @class PredictionCalculationService
 * @description Service für die Berechnung und Generierung von Vorhersagen
 * Erstellt Mock-Vorhersagen basierend auf einfachen Algorithmen
 */
@Injectable()
export class PredictionCalculationService {
  private readonly logger = new Logger(PredictionCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * @method generateDayPredictions
   * @description Generiert Tagesvorhersagen für einen bestimmten Tag und Raum
   */
  async generateDayPredictions(date: Date, roomId: string) {
    this.logger.debug(`Generating day predictions for ${date.toISOString()} and room ${roomId}`);

    const timeSlots = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];
    const predictions: any[] = [];

    // Hole Raumkapazität
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });
    const capacity = room?.maxCapacity || 20;

    for (const time of timeSlots) {
      // Einfache Mock-Logik für Vorhersagen
      const occupancy = this.calculateMockOccupancy(time, capacity);
      const color = this.calculateColor(occupancy, capacity);

      const prediction = await this.prisma.dayPrediction.create({
        data: {
          time,
          occupancy,
          color,
          date,
          roomId,
          confidence: 0.75, // Mock-Konfidenz
        },
      });

      predictions.push(prediction);
    }

    return predictions;
  }

  /**
   * @method generateWeekPredictions
   * @description Generiert Wochenvorhersagen für eine bestimmte Woche und Raum
   */
  async generateWeekPredictions(weekStart: Date, roomId: string) {
    this.logger.debug(`Generating week predictions for week starting ${weekStart.toISOString()} and room ${roomId}`);

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const predictions: any[] = [];

    // Hole Raumkapazität
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });
    const capacity = room?.maxCapacity || 20;

    for (const day of weekDays) {
      // Einfache Mock-Logik für Wochenvorhersagen
      const occupancy = this.calculateMockWeekOccupancy(day, capacity);
      const color = this.calculateColor(occupancy, capacity);

      const prediction = await this.prisma.weekPrediction.create({
        data: {
          day,
          occupancy,
          color,
          weekStart,
          roomId,
          confidence: 0.70, // Mock-Konfidenz
        },
      });

      predictions.push(prediction);
    }

    return predictions;
  }

  /**
   * @method calculateMockOccupancy
   * @description Berechnet Mock-Belegung basierend auf Tageszeit
   */
  private calculateMockOccupancy(time: string, capacity: number): number {
    const timeFactors = {
      '8 AM': 0.1,   // Früh morgens wenig los
      '10 AM': 0.6,  // Vormittags mehr Aktivität
      '12 PM': 0.9,  // Mittagszeit sehr voll
      '2 PM': 0.7,   // Nachmittags noch gut besucht
      '4 PM': 0.4,   // Spätnachmittags weniger
      '6 PM': 0.2,   // Abends fast leer
    };

    const factor = timeFactors[time] || 0.5;
    return Math.round(capacity * factor);
  }

  /**
   * @method calculateMockWeekOccupancy
   * @description Berechnet Mock-Belegung basierend auf Wochentag
   */
  private calculateMockWeekOccupancy(day: string, capacity: number): number {
    const dayFactors = {
      'Mon': 0.3,  // Montag ruhiger Start
      'Tue': 0.7,  // Dienstag volle Aktivität
      'Wed': 0.8,  // Mittwoch Höhepunkt
      'Thu': 0.6,  // Donnerstag noch gut
      'Fri': 0.4,  // Freitag entspannter
    };

    const factor = dayFactors[day] || 0.5;
    return Math.round(capacity * factor);
  }

  /**
   * @method calculateColor
   * @description Berechnet Farbkodierung basierend auf Belegungsgrad
   */
  private calculateColor(occupancy: number, capacity: number): string {
    if (capacity === 0) return 'green';
    
    const percentage = (occupancy / capacity) * 100;
    
    if (percentage >= 90) return 'red';
    if (percentage >= 60) return 'yellow';
    return 'green';
  }
}

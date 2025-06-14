import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PredictionsService } from '../services/predictions.service';
import { DayPredictionResponseDto, WeekPredictionResponseDto } from '../dto';

/**
 * @class PredictionsController
 * @description REST Controller für Vorhersage-Endpunkte
 * Implementiert die API-Spezifikation für /api/predictions/*
 */
@Controller('api/predictions')
@ApiTags('Predictions')
export class PredictionsController {
  private readonly logger = new Logger(PredictionsController.name);

  constructor(private readonly predictionsService: PredictionsService) {}

  /**
   * @method getDayPredictions
   * @description Liefert Vorhersagen für die Laborbelegung im Tagesverlauf
   * Entspricht GET /api/predictions/day aus der API-Dokumentation
   */
  @Get('day')
  @ApiOperation({
    summary: 'Tagesvorhersagen für Laborbelegung',
    description: 'Liefert Vorhersagen für die Laborbelegung im Tagesverlauf',
  })
  @ApiResponse({
    status: 200,
    description: 'Tagesvorhersagen erfolgreich abgerufen',
    type: DayPredictionResponseDto,
  })
  async getDayPredictions(): Promise<DayPredictionResponseDto> {
    this.logger.debug('REST API: GET /api/predictions/day');
    return this.predictionsService.getDayPredictions();
  }

  /**
   * @method getWeekPredictions
   * @description Liefert durchschnittliche Vorhersagen für die Laborbelegung pro Wochentag
   * Entspricht GET /api/predictions/week aus der API-Dokumentation
   */
  @Get('week')
  @ApiOperation({
    summary: 'Wochenvorhersagen für Laborbelegung',
    description: 'Liefert durchschnittliche Vorhersagen für die Laborbelegung pro Wochentag',
  })
  @ApiResponse({
    status: 200,
    description: 'Wochenvorhersagen erfolgreich abgerufen',
    type: WeekPredictionResponseDto,
  })
  async getWeekPredictions(): Promise<WeekPredictionResponseDto> {
    this.logger.debug('REST API: GET /api/predictions/week');
    return this.predictionsService.getWeekPredictions();
  }
}

import { Controller, Get, Post, Body, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PredictionsService } from '../services/predictions.service';
import {
  DayPredictionResponseDto,
  WeekPredictionResponseDto,
  ExtendedWeekPredictionResponseDto,
  PredictionRequestDto,
  SinglePredictionResponseDto,
} from '../dto';

/**
 * @class PredictionsController
 * @description REST Controller für Vorhersage-Endpunkte
 * Implementiert die API-Spezifikation für /api/predictions/*
 */
@Controller('api/predictions')
@ApiTags('🤖 Predictions')
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
    description:
      'Liefert Vorhersagen für die Laborbelegung im Tagesverlauf. Standardmäßig für heute, oder für ein spezifisches Datum via `?date=YYYY-MM-DD`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tagesvorhersagen erfolgreich abgerufen',
    type: DayPredictionResponseDto,
  })
  async getDayPredictions(
    @Query('date') date?: string,
  ): Promise<DayPredictionResponseDto> {
    this.logger.debug(
      `REST API: GET /api/predictions/day for date: ${date || 'today'}`,
    );
    return this.predictionsService.getDayPredictions(date);
  }

  /**
   * @method getWeekPredictions
   * @description Liefert erweiterte Vorhersagen für aktuelle und nächste Woche (Montag-Freitag)
   * Entspricht GET /api/predictions/week aus der API-Dokumentation (erweitert)
   */
  @Get('week')
  @ApiOperation({
    summary: 'Erweiterte Wochenvorhersagen für Laborbelegung',
    description: 'Liefert Vorhersagen für aktuelle und nächste Woche (Montag-Freitag)',
  })
  @ApiResponse({
    status: 200,
    description: 'Erweiterte Wochenvorhersagen erfolgreich abgerufen',
    type: ExtendedWeekPredictionResponseDto,
  })
  async getWeekPredictions(): Promise<ExtendedWeekPredictionResponseDto> {
    this.logger.debug('REST API: GET /api/predictions/week');
    return this.predictionsService.getWeekPredictions();
  }

  /**
   * @method getSinglePrediction
   * @description Liefert eine ML-Vorhersage für einen spezifischen Zeitpunkt
   * Entspricht POST /api/predictions/single aus der API-Erweiterung
   */
  @Post('single')
  @ApiOperation({
    summary: 'Einzelne ML-Vorhersage für spezifischen Zeitpunkt',
    description: 'Ruft eine Vorhersage vom ML-Service für einen konkreten Zeitpunkt ab',
  })
  @ApiResponse({
    status: 200,
    description: 'ML-Vorhersage erfolgreich abgerufen',
    type: SinglePredictionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ungültiger Zeitstempel',
  })
  @ApiResponse({
    status: 503,
    description: 'ML-Service nicht verfügbar oder Model nicht trainiert',
  })
  async getSinglePrediction(
    @Body() request: PredictionRequestDto,
  ): Promise<SinglePredictionResponseDto> {
    this.logger.debug(`REST API: POST /api/predictions/single for ${request.timestamp}`);
    return this.predictionsService.getSinglePrediction(request);
  }
}

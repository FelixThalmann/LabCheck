import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PredictionsService } from '../services/predictions.service';
import {
  DayPredictionResponseDto,
  WeekPredictionResponseDto,
  PredictionRequestDto,
  SinglePredictionResponseDto,
} from '../dto';

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

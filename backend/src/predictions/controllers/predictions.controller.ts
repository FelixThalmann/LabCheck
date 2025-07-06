import { Controller, Get, Post, Body, Logger, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { PredictionsService } from '../services/predictions.service';
import { ApiKeyAuthGuard } from '../../auth/guards/api-key-auth.guard';
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
 * Alle Endpunkte erfordern API-Key-Authentifizierung über X-API-Key Header
 */
@Controller('api/predictions')
@ApiTags('🤖 Predictions')
@ApiSecurity('X-API-Key')
@UseGuards(ApiKeyAuthGuard)
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
    summary: 'Get Daily Predictions',
    description:
      'Returns daily occupancy predictions for the laboratory. Defaults to today, or specify a date using `?date=YYYY-MM-DD`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily predictions retrieved successfully',
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
    summary: 'Get Weekly Predictions',
    description: 'Returns predictions for current and next week (Monday-Friday)',
  })
  @ApiResponse({
    status: 200,
    description: 'Weekly predictions retrieved successfully',
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
    summary: 'Get Single ML Prediction',
    description: 'Retrieves a prediction from the ML service for a specific timestamp',
  })
  @ApiResponse({
    status: 200,
    description: 'ML prediction retrieved successfully',
    type: SinglePredictionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid timestamp',
  })
  @ApiResponse({
    status: 503,
    description: 'ML service unavailable or model not trained',
  })
  async getSinglePrediction(
    @Body() request: PredictionRequestDto,
  ): Promise<SinglePredictionResponseDto> {
    this.logger.debug(`REST API: POST /api/predictions/single for ${request.timestamp}`);
    return this.predictionsService.getSinglePrediction(request);
  }
}

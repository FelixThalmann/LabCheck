import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { PredictionRequestDto, MLPredictionResponseDto } from '../dto';

/**
 * @class PredictionApiService
 * @description HTTP-Client für FastAPI ML Prediction Service
 * Implementiert Kommunikation mit dem externen prediction-service Container
 */
@Injectable()
export class PredictionApiService {
  private readonly logger = new Logger(PredictionApiService.name);
  private readonly predictionServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Konfiguration der prediction-service URL
    this.predictionServiceUrl = this.configService.get<string>(
      'PREDICTION_SERVICE_URL',
      'http://localhost:3100', // Default für lokale Entwicklung
    );
    this.logger.log(`Prediction API Service URL: ${this.predictionServiceUrl}`);
  }

  /**
   * @method getSinglePrediction
   * @description Ruft eine Vorhersage vom FastAPI Service ab
   * @param request - Zeitstempel für die Vorhersage
   * @returns Promise mit der ML-Vorhersage
   * @throws HttpException bei Fehlern der FastAPI-Kommunikation
   */
  async getSinglePrediction(
    request: PredictionRequestDto,
  ): Promise<MLPredictionResponseDto> {
    this.logger.debug(
      `Requesting prediction for timestamp: ${request.timestamp}`,
    );

    try {
      // HTTP POST Request an FastAPI /predict Endpunkt
      const response: AxiosResponse<MLPredictionResponseDto> =
        await firstValueFrom(
          this.httpService.post<MLPredictionResponseDto>(
            `${this.predictionServiceUrl}/predict`,
            {
              timestamp: request.timestamp,
            },
            {
              timeout: 10000, // 10 Sekunden timeout
              headers: {
                'Content-Type': 'application/json',
              },
            },
          ),
        );

      this.logger.debug(
        `Successfully received prediction: occupancy=${response.data.predicted_occupancy}, door=${response.data.prediction_isDoorOpen}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to get prediction from ML service: ${error.message}`,
        error.stack,
      );

      // Spezifische Fehlerbehandlung je nach Fehlertyp
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new HttpException(
          'ML Prediction Service ist nicht erreichbar',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error.response?.status === 503) {
        throw new HttpException(
          'ML Model ist nicht geladen oder trainiert',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error.response?.status === 400) {
        throw new HttpException(
          'Ungültiger Zeitstempel für Vorhersage',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Allgemeiner Fehler
      throw new HttpException(
        'Fehler beim Abrufen der ML-Vorhersage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @method getMultiplePredictions
   * @description Ruft mehrere Vorhersagen für verschiedene Zeitpunkte ab
   * @param timestamps - Array von Zeitstempeln
   * @returns Promise mit Array von ML-Vorhersagen
   */
  async getMultiplePredictions(
    timestamps: string[],
  ): Promise<MLPredictionResponseDto[]> {
    this.logger.debug(
      `Requesting ${timestamps.length} predictions for batch processing`,
    );

    const predictions: MLPredictionResponseDto[] = [];
    
    // Sequenzielle Verarbeitung um API nicht zu überlasten
    for (const timestamp of timestamps) {
      try {
        const prediction = await this.getSinglePrediction({ timestamp });
        predictions.push(prediction);
        
        // Kurze Pause zwischen Requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.logger.warn(
          `Failed to get prediction for ${timestamp}: ${error.message}`,
        );
        // Fallback-Vorhersage bei Fehlern
        predictions.push({
          predicted_occupancy: 0,
          prediction_isDoorOpen: false,
          prediction_for_timestamp: timestamp,
          last_trained_at: null,
        });
      }
    }

    return predictions;
  }

  /**
   * @method healthCheck
   * @description Prüft ob der ML-Service erreichbar ist
   * @returns Promise<boolean> - true wenn Service verfügbar
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.predictionServiceUrl}/health`, {
          timeout: 5000,
        }),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.warn(`ML Service health check failed: ${error.message}`);
      return false;
    }
  }
}

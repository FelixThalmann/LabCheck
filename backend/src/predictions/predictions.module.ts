import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma.module';
import { PredictionsController } from './controllers/predictions.controller';
import { PredictionsService } from './services/predictions.service';
import { PredictionCalculationService } from './services/prediction-calculation.service';
import { PredictionApiService } from './services/prediction-api.service';
import { HolidayService } from './services/holiday.service';

/**
 * @class PredictionsModule
 * @description Modul für Vorhersage-Funktionalität
 * Stellt Controller und Services für Predictions bereit
 */
@Module({
  imports: [
    PrismaModule,
    HttpModule,
    ConfigModule,
  ],
  controllers: [PredictionsController],
  providers: [
    PredictionsService,
    PredictionCalculationService,
    PredictionApiService,
    HolidayService,
  ],
  exports: [PredictionsService],
})
export class PredictionsModule {}

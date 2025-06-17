import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { PredictionsController } from './controllers/predictions.controller';
import { PredictionsService } from './services/predictions.service';
import { PredictionCalculationService } from './services/prediction-calculation.service';

/**
 * @class PredictionsModule
 * @description Modul für Vorhersage-Funktionalität
 * Stellt Controller und Services für Predictions bereit
 */
@Module({
  imports: [PrismaModule],
  controllers: [PredictionsController],
  providers: [
    PredictionsService,
    PredictionCalculationService,
  ],
  exports: [PredictionsService],
})
export class PredictionsModule {}

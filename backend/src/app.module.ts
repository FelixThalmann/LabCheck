import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { CoreModule } from './core/core.module';
import { MqttModule } from './mqtt/mqtt.module';
import { EventsModule } from './events/events.module';
import { LabStatusModule } from './lab-status/lab-status.module';
import { PredictionsModule } from './predictions/predictions.module';
import { OccupancyModule } from './occupancy/occupancy.module';

/**
 * Main application module that imports all feature modules
 * Provides global configuration and orchestrates all application services
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CoreModule, // Central services (demo mode)
    PrismaModule,
    MqttModule,
    EventsModule,
    LabStatusModule, // Extended for REST API
    PredictionsModule, // ML predictions
    OccupancyModule, // Occupancy management
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Authentication temporarily disabled
    // {
    //   provide: APP_GUARD,
    //   useClass: ApiKeyAuthGuard,
    // },
  ],
})
export class AppModule {}

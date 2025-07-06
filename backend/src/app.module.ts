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


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CoreModule, // Zentrale Services (Demo-Modus)
    PrismaModule,
    MqttModule,
    EventsModule,
    LabStatusModule, // Erweitert für REST API
    PredictionsModule, // Neu für Vorhersagen
    OccupancyModule, // Neu für Belegungsmanagement
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Authentifizierung temporär deaktiviert
    // {
    //   provide: APP_GUARD,
    //   useClass: ApiKeyAuthGuard,
    // },
  ],
})
export class AppModule {}

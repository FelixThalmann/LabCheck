import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { MqttModule } from './mqtt/mqtt.module';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LabStatusModule } from './lab-status/lab-status.module';
import { PredictionsModule } from './predictions/predictions.module';
import { OccupancyModule } from './occupancy/occupancy.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UsersModule,
    AuthModule, // Enthält jetzt den ApiKeyAuthGuard in seinen Providern
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

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { MqttModule } from './mqtt/mqtt.module';
import { LabSettingsModule } from './lab-settings/lab-settings.module';
import { DoorModule } from './door/door.module';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
// import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'; // Alten Guard auskommentieren oder löschen
import { ApiKeyAuthGuard } from './auth/guards/api-key-auth.guard'; // Neuen Guard importieren
import { LabStatusModule } from './lab-status/lab-status.module';
import { PredictionsModule } from './predictions/predictions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      context: ({ req, res }) => ({ req, res }), // Diese Zeile ist wichtig!
    }),
    PrismaModule,
    UsersModule,
    AuthModule, // Enthält jetzt den ApiKeyAuthGuard in seinen Providern
    MqttModule,
    LabSettingsModule,
    DoorModule,
    EventsModule,
    LabStatusModule, // Erweitert für REST API
    PredictionsModule, // Neu für Vorhersagen
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

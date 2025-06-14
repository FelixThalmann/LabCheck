import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as passport from 'passport';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // MQTT Microservice Konfiguration
  const mqttBrokerUrl = app
    .get(ConfigService)
    .get<string>('MQTT_BROKER_URL', 'mqtt://localhost:1883');
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      url: mqttBrokerUrl, // URL Ihres Mosquitto-Brokers
      // Weitere Optionen hier, falls benötigt (z.B. Benutzername, Passwort)
      // username: 'user',
      // password: 'password',
      // clientId: `nest-mqtt-client-${Math.random().toString(16).substring(2, 8)}` // Eindeutige Client-ID
    },
  });

  app.use(passport.initialize());

  // Swagger API-Dokumentation konfigurieren
  const config = new DocumentBuilder()
    .setTitle('LabCheck API')
    .setDescription('REST API für das LabCheck System - Laborüberwachung und Vorhersagen')
    .setVersion('1.0')
    .addTag('Lab Status', 'Endpunkte für den aktuellen Laborstatus')
    .addTag('Predictions', 'Endpunkte für Belegungsvorhersagen')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
      },
      'api-key',
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'LabCheck API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Globale ValidationPipe für automatische Validierung von DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Unbekannte Properties aus Requests entfernen
      transform: true, // Eingehende Daten in DTO-Instanzen umwandeln
      forbidNonWhitelisted: true, // Fehler werfen, wenn unbekannte Properties gesendet werden
      transformOptions: {
        enableImplicitConversion: true, // Automatische Typkonvertierung (z.B. String zu Number für Path-Params)
      },
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  await app.startAllMicroservices(); // Startet alle Microservices (inkl. MQTT)
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`MQTT Microservice connected to: ${mqttBrokerUrl}`);
}
bootstrap();

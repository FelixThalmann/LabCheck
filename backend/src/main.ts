import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as passport from 'passport';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Demo-Modus Konfiguration und Logging
  const isDemoMode = configService.get<boolean>('DEMO_MODE', false);
  
  if (isDemoMode) {
    const demoDay = configService.get<string>('DEMO_DAY');
    if (demoDay) {
      const demoDate = new Date(demoDay);
      if (!isNaN(demoDate.getTime())) {
        const currentDate = new Date();
        const demoDateWithCurrentTime = new Date(demoDate);
        demoDateWithCurrentTime.setHours(currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds(), currentDate.getMilliseconds());
        
        console.log('========================================');
        console.log('LABCHECK DEMO MODE ACTIVATED');
        console.log(`Demo Date: ${demoDateWithCurrentTime.toISOString().split('T')[0]}`);
        console.log(`Demo Timestamp: ${demoDateWithCurrentTime.toISOString()}`);
        console.log('All services will use this date instead of current date');
        console.log('========================================');
      } else {
        console.warn(`⚠️  Invalid DEMO_DAY format: ${demoDay}, falling back to current date`);
        console.log('📅 LabCheck running in normal mode (current date)');
      }
    } else {
      console.warn('⚠️  DEMO_MODE is true but DEMO_DAY is not set, falling back to current date');
      console.log('📅 LabCheck running in normal mode (current date)');
    }
  } else {
    console.log('📅 LabCheck running in normal mode (current date)');
  }

  // MQTT Microservice Konfiguration
  const mqttBrokerUrl = app
    .get(ConfigService)
    .get<string>('MQTT_BROKER_URL', 'mqtt://labcheck_mosquitto:1883');
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
    .setDescription(`
      **REST API für das LabCheck System - Laborüberwachung und ML-Vorhersagen**
      
      Diese API bietet Endpunkte für:
      - 📊 **Laborstatus**: Aktuelle Belegung und Türstatus
      - 🤖 **ML-Vorhersagen**: Tages- und Wochenvorhersagen mit Machine Learning
      - 🔒 **Authentifizierung**: API-Key oder JWT-basiert
      
      **Neue Features:**
      - ✨ Erweiterte Wochenvorhersagen (aktuelle + nächste Woche)
      - 📅 Korrekte Wochenberechnung (immer Montag-Freitag)
      - 🎯 Einzelne ML-Vorhersagen für spezifische Zeitpunkte
    `)
    .setVersion('2.0')
    .setContact('LabCheck Team', 'https://github.com/your-repo/labcheck', 'admin@labcheck.com')
    .addServer('http://localhost:3000', 'Development Server')
    .addServer('https://api.labcheck.com', 'Production Server')
    .addTag('🏠 Lab Status', 'Endpunkte für den aktuellen Laborstatus und kombinierte Daten')
    .addTag('🤖 Predictions', 'Endpunkte für ML-basierte Belegungsvorhersagen')
    .addTag('🔐 Authentication', 'Endpunkte für Benutzeranmeldung und -registrierung')
    .addTag('👥 Users', 'Endpunkte für Benutzerverwaltung')
    .addTag('📡 MQTT Events', 'WebSocket- und Event-basierte Kommunikation')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API-Schlüssel für die Authentifizierung. Format: X-API-Key: your-api-key-here',
      },
      'api-key',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'JWT Token für die Authentifizierung. Erhalten Sie das Token über /auth/login',
        in: 'header',
      },
      'bearer-token',
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'LabCheck API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2c5282; }
      .swagger-ui .info .description { font-size: 14px; line-height: 1.6; }
      .swagger-ui .scheme-container { background: #f7fafc; padding: 10px; border-radius: 5px; }
      .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #38a169; }
      .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #3182ce; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
      filter: true,
      showRequestDuration: true,
    },
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

  const port = configService.get<number>('PORT') || 3001;

  await app.startAllMicroservices(); // Startet alle Microservices (inkl. MQTT)
  await app.listen(port);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
  console.log(`📚 Swagger UI available at: ${await app.getUrl()}/api/docs`);
  console.log(`📡 MQTT Microservice connected to: ${mqttBrokerUrl}`);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as passport from 'passport';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

/**
 * Bootstrap function to initialize and start the LabCheck application
 * Configures demo mode, MQTT microservice, authentication, Swagger documentation,
 * and global validation pipes
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Configure demo mode and logging
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

  // Configure MQTT microservice
  const mqttBrokerUrl = app
    .get(ConfigService)
    .get<string>('MQTT_BROKER_URL', 'mqtt://labcheck_mosquitto:1883');
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      url: mqttBrokerUrl,
      // Additional options can be configured here (username, password, clientId)
      // username: 'user',
      // password: 'password',
      // clientId: `nest-mqtt-client-${Math.random().toString(16).substring(2, 8)}`
    },
  });

  app.use(passport.initialize());

  // Configure Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('LabCheck API')
    .setDescription(`
      **REST API for the LabCheck System - Laboratory monitoring and ML predictions**
      
      This API provides comprehensive endpoints for laboratory monitoring, occupancy tracking, and machine learning predictions.
      
      ## Core Features
      - 🏠 **Laboratory Status**: Real-time occupancy, door status, and capacity management
      - 🤖 **ML Predictions**: Daily and weekly occupancy predictions using machine learning
      - 📡 **Real-time Events**: WebSocket-based real-time updates for door and occupancy changes
      - 🔒 **Authentication**: API-Key based authentication for secure access
      - 📊 **Data Management**: Capacity settings and entrance direction configuration
      
      ## API Structure
      - **Lab Status** (/api/lab/*): Current laboratory status, capacity management
      - **Predictions** (/api/predictions/*): ML-based occupancy predictions
      - **Health Check** (/): Service health verification
      
      ## Real-time Communication
      The system also provides WebSocket endpoints for real-time updates:
      - Door status changes
      - Occupancy updates
      - Capacity modifications
      
      ## Authentication
      Most endpoints require API key authentication via the X-API-Key header.
      Set your API key in the environment variable STATIC_API_KEY.
    `)
    .setVersion('2.1')
    .setContact('LabCheck Team', 'https://github.com/your-repo/labcheck', 'admin@labcheck.com')
    .addServer('http://localhost:3001', 'Development Server')
    .addServer('https://api.labcheck.com', 'Production Server')
    .addTag('🏠 Lab Status', 'Endpoints for current laboratory status, capacity management, and settings')
    .addTag('🤖 Predictions', 'Endpoints for ML-based occupancy predictions and forecasting')
    .addTag('🔍 Health Check', 'Basic service health and status verification')
    .addTag('📡 Real-time Events', 'WebSocket events for real-time laboratory updates')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key for authentication. Set your API key in the STATIC_API_KEY environment variable. Format: X-API-Key: your-api-key-here',
      },
      'api-key',
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

  // Global ValidationPipe for automatic DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove unknown properties from requests
      transform: true, // Transform incoming data into DTO instances
      forbidNonWhitelisted: true, // Throw error if unknown properties are sent
      transformOptions: {
        enableImplicitConversion: true, // Automatic type conversion (e.g., String to Number for Path params)
      },
    }),
  );

  const port = configService.get<number>('PORT') || 3001;

  await app.startAllMicroservices(); // Start all microservices (including MQTT)
  await app.listen(port);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
  console.log(`📚 Swagger UI available at: ${await app.getUrl()}/api/docs`);
  console.log(`📡 MQTT Microservice connected to: ${mqttBrokerUrl}`);
}
bootstrap();

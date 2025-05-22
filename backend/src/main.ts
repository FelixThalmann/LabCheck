import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();

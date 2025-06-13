import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module'; // UsersService wird hierdurch verfügbar
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller'; // Sicherstellen, dass dieser Import korrekt ist
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard'; // ApiKeyAuthGuard importieren

@Module({
  imports: [
    UsersModule, // Stellt UsersService bereit
    PassportModule.register({ defaultStrategy: 'jwt', session: false }), // session: false hinzugefügt
    ConfigModule, // Stellt sicher, dass ConfigService verfügbar ist (sollte global im AppModule sein)
    JwtModule.registerAsync({
      imports: [ConfigModule], // Importiert ConfigModule für den Factory-Zugriff
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME', '3600s'), // Defaultwert falls nicht in .env
        },
      }),
      inject: [ConfigService], // Injiziert ConfigService in die Factory
    }),
  ],
  providers: [
    AuthService, 
    // LocalStrategy, // Temporär deaktiviert
    // JwtStrategy,   // Temporär deaktiviert - verursacht Fehler ohne JWT_SECRET
    ApiKeyAuthGuard
  ],
  controllers: [AuthController], // Stellt die HTTP-Endpunkte (z.B. /auth/login) bereit
  exports: [AuthService, JwtModule, ApiKeyAuthGuard], // AuthService und JwtModule exportieren, falls sie von anderen Modulen direkt benötigt werden
})
export class AuthModule {}

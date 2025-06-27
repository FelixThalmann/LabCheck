import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Definiert die Struktur des Payloads, der im JWT gespeichert und nach der Validierung zurückgegeben wird.
 */
export interface JwtPayload {
  email: string;
  sub: string; // User ID (Subject des Tokens)
  // Hier könnten weitere Daten aus dem Token hinzukommen, z.B. Rollen
  // roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extrahiert das Token aus dem 'Authorization: Bearer <token>' Header
      ignoreExpiration: false, // Wichtig: Abgelaufene Tokens werden als ungültig betrachtet
      secretOrKey: configService.get<string>('JWT_SECRET'), // Holt das Secret aus der Konfiguration (.env)
    });
  }

} 
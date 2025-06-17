import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { User as UserModel } from '@prisma/client'; // Prisma User Modell

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
    private readonly usersService: UsersService, // Um den Benutzer frisch aus der DB zu laden (Best Practice)
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extrahiert das Token aus dem 'Authorization: Bearer <token>' Header
      ignoreExpiration: false, // Wichtig: Abgelaufene Tokens werden als ungültig betrachtet
      secretOrKey: configService.get<string>('JWT_SECRET'), // Holt das Secret aus der Konfiguration (.env)
    });
  }

  /**
   * Validiert den JWT-Payload.
   * Wird von Passport aufgerufen, nachdem das Token erfolgreich entschlüsselt und verifiziert wurde.
   * @param payload Der entschlüsselte JWT-Payload.
   * @returns Das Benutzerobjekt (ohne Passwort), wenn das Token gültig ist und der Benutzer existiert.
   * @throws UnauthorizedException Wenn der Benutzer nicht gefunden wird oder das Token anderweitig ungültig ist.
   */
  async validate(payload: JwtPayload): Promise<Omit<UserModel, 'password'>> {
    // Es ist eine gute Praxis, den Benutzer hier erneut aus der Datenbank zu laden,
    // um sicherzustellen, dass der Benutzer noch existiert, nicht gesperrt wurde etc.,
    // seit das Token ausgestellt wurde.
    const user = await this.usersService.findOneById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Benutzer nicht gefunden oder Token ist ungültig.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user; // Passwort entfernen
    return result; // Dieses Objekt wird an request.user angehängt (oder context.req.user in GraphQL)
  }
} 
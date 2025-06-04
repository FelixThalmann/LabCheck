import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '@prisma/client';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ 
      usernameField: 'email', // Wir verwenden E-Mail als 'Benutzername' für die Strategie
      // passwordField: 'password' // Ist Standard, muss nicht explizit gesetzt werden
    });
  }

  /**
   * Validiert den Benutzer anhand der vom AuthService bereitgestellten Logik.
   * Wird von Passport aufgerufen, nachdem die Standard-Extraktion von email/password erfolgt ist.
   * @param email Die vom Client übermittelte E-Mail.
   * @param password Das vom Client übermittelte Passwort.
   * @returns Das Benutzerobjekt (ohne Passwort), wenn die Validierung erfolgreich ist.
   * @throws UnauthorizedException Wenn die Validierung fehlschlägt.
   */
  async validate(email: string, password: string): Promise<Omit<User, 'password'>> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Ungültige Anmeldedaten. Bitte überprüfen Sie E-Mail und Passwort.');
    }
    return user;
  }
} 
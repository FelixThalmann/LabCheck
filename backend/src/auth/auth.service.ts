import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client'; // Prisma User Modell
// Import LoginDto, falls für Typisierung innerhalb des Services benötigt, aber primär im Controller.
// import { LoginDto } from './dto/login.dto';
// Import RegisterDto, falls Registrierung implementiert wird.
// import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validiert einen Benutzer anhand von E-Mail und Passwort.
   * @param email Die E-Mail des Benutzers.
   * @param pass Das Passwort des Benutzers.
   * @returns Den Benutzerdatensatz ohne Passwort, falls gültig, sonst null.
   */
  async validateUser(email: string, pass: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user; // Passwort aus dem Ergebnis entfernen
      return result;
    }
    return null;
  }

  /**
   * Erstellt ein JWT für einen gegebenen Benutzer.
   * @param user Der Benutzer (ohne Passwort), für den das Token erstellt werden soll.
   * @returns Ein Objekt mit dem Access Token.
   */
  async login(user: Omit<User, 'password'>) {
    const payload = { email: user.email, sub: user.id }; // 'sub' ist Standard für Subject/User-ID im JWT
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Registriert einen neuen Benutzer.
   * Hashes the password and stores the new user.
   * Then logs in the new user by generating a JWT.
   * @param email 
   * @param plainPassword 
   * @param name 
   * @returns 
   */
  async register(email: string, plainPassword: string, name?: string): Promise<{ access_token: string }> {
    const existingUser = await this.usersService.findOneByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.');
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10); // 10 ist ein guter Salt-Wert
    
    const newUser = await this.usersService.create({
      email,
      password: hashedPassword,
      name: name,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userToLogin } = newUser;
    return this.login(userToLogin);
  }
} 
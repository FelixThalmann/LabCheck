import { Controller, Post, UseGuards, Request, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator'; // Wird in Phase 4 erstellt
import { User as UserModel } from '@prisma/client'; // Import für den Typ von req.user
// Import für RegisterDto, falls Registrierung implementiert wird
// import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Endpunkt für den Benutzer-Login.
   * Verwendet die 'local' Authentifizierungsstrategie.
   * @param req Das Request-Objekt, `req.user` wird von der LocalStrategy gefüllt.
   * @param loginDto Die Login-Daten aus dem Request Body (validiert durch LoginDto).
   * @returns Ein Objekt mit dem Access Token bei erfolgreichem Login.
   */
  @Public() // Dieser Endpunkt ist öffentlich und erfordert keine JWT-Authentifizierung.
  @UseGuards(AuthGuard('local')) // Aktiviert die LocalStrategy für diesen Endpunkt.
  @HttpCode(HttpStatus.OK) // Stellt sicher, dass bei Erfolg 200 OK zurückgegeben wird, nicht 201 Created.
  @Post('login')
  async login(@Request() req: { user: Omit<UserModel, 'password'> }, @Body() loginDto: LoginDto) {
    // loginDto wird hier für die Validierung des Request-Body durch class-validator verwendet.
    // Der eigentliche Login-Prozess (Passwortvergleich etc.) geschieht in der LocalStrategy und AuthService.validateUser.
    // req.user enthält den von LocalStrategy.validate() zurückgegebenen Benutzer (ohne Passwort).
    return this.authService.login(req.user);
  }

  /**
   * Optional: Endpunkt für die Benutzerregistrierung.
   * @param registerDto Die Registrierungsdaten aus dem Request Body.
   * @returns Ein Objekt mit dem Access Token bei erfolgreicher Registrierung und Login.
   */
  
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) { // RegisterDto müsste erstellt und validiert werden
    // Hier würde man registerDto.email, registerDto.password, registerDto.name (optional) verwenden
    return this.authService.register(registerDto.email, registerDto.password, registerDto.username);
  }
  

  // Beispiel für einen geschützten Endpunkt zum Testen des JWTs.
  // Dieser wird später durch den globalen Guard geschützt oder kann hier bleiben.
  /*
  @UseGuards(AuthGuard('jwt')) // Schützt diesen Endpunkt mit der JwtStrategy.
  @Get('profile')
  getProfile(@Request() req: { user: Omit<UserModel, 'password'> }) {
    // req.user enthält den von JwtStrategy.validate() zurückgegebenen Benutzer.
    return req.user;
  }
  */
} 
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Defines the structure of the payload stored in JWT and returned after validation
 */
export interface JwtPayload {
  email: string;
  sub: string; // User ID (Token subject)
  // Additional data could be added here, e.g., roles
  // roles: string[];
}

/**
 * JWT strategy for Passport authentication
 * Handles JWT token validation and user extraction
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extracts token from 'Authorization: Bearer <token>' header
      ignoreExpiration: false, // Important: Expired tokens are considered invalid
      secretOrKey: configService.get<string>('JWT_SECRET'), // Gets secret from configuration (.env)
    });
  }
} 
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * API Key authentication guard
 * Validates API keys from request headers for both HTTP and GraphQL contexts
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);
  private readonly expectedApiKey: string | undefined;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.expectedApiKey = this.configService.get<string>('STATIC_API_KEY');
    
    // Debug: Log all available environment variables (for debugging only)
    this.logger.debug('Available environment variables:', Object.keys(process.env).filter(key => key.includes('API')));
    this.logger.debug(`ConfigService.get('STATIC_API_KEY'): ${this.expectedApiKey ? '[SET]' : '[UNDEFINED]'}`);
    this.logger.debug(`process.env.STATIC_API_KEY: ${process.env.STATIC_API_KEY ? '[SET]' : '[UNDEFINED]'}`);
    
    if (!this.expectedApiKey) {
      this.logger.error('CRITICAL: STATIC_API_KEY is not defined in environment variables.');
      this.logger.error('Please ensure STATIC_API_KEY is set in your .env file or environment.');
      // Fallback to process.env in case ConfigService doesn't work
      this.expectedApiKey = process.env.STATIC_API_KEY;
      if (this.expectedApiKey) {
        this.logger.warn('Using fallback process.env.STATIC_API_KEY');
      } else {
        this.logger.error('Neither ConfigService nor process.env contain STATIC_API_KEY');
      }
    } else {
      this.logger.log('STATIC_API_KEY successfully loaded via ConfigService');
    }
  }

  /**
   * Validates API key from request headers
   * @param context - Execution context containing request information
   * @returns boolean - true if authentication succeeds, false otherwise
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    this.logger.log('ApiKeyAuthGuard canActivate called.');

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.log('Route is public, access granted without API Key.');
      return true;
    }

    let request;
    if (context.getType<string>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      request = gqlContext.getContext().req;
    } else {
      request = context.switchToHttp().getRequest();
    }

    if (!request) {
      this.logger.error('Request object is undefined, cannot retrieve API Key.');
      throw new UnauthorizedException('Internal authentication error.');
    }

    // Node.js automatically converts HTTP headers to lowercase
    // Client sends: "X-API-Key: 12345" -> becomes: request.headers['x-api-key']
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      this.logger.warn('API Key (X-API-Key) missing from request headers.');
      throw new UnauthorizedException('API Key missing.');
    }

    if (apiKey === this.expectedApiKey) {
      this.logger.log('Valid API Key received.');
      // Optional: You could attach a dummy user object to request.user here if your services/resolvers expect it
      // request.user = { id: 'static-api-user', roles: ['admin'] }; 
      return true;
    } else {
      this.logger.log(`Received API Key: ${apiKey}`);
      this.logger.log(`Expected API Key: ${this.expectedApiKey}`);
      this.logger.warn('Invalid API Key received.');
      throw new UnauthorizedException('Invalid API Key.');
    }
  }
}

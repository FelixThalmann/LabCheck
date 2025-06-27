import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);
  private readonly expectedApiKey: string | undefined;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.expectedApiKey = this.configService.get<string>('STATIC_API_KEY');
    if (!this.expectedApiKey) {
      this.logger.error('STATIC_API_KEY is not defined in environment variables. API Key authentication will fail.');
      // Optional: Anwendungstart verhindern, wenn Key fehlt
      // throw new Error('STATIC_API_KEY is not defined in environment variables.');
    }
  }

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
      throw new UnauthorizedException('Interner Authentifizierungsfehler.');
    }

    const apiKey = request.headers['X-API-Key']; // Wir erwarten den API-Key im Header 'X-API-Key'

    if (!apiKey) {
      this.logger.warn('API Key (X-API-Key) missing from request headers.');
      throw new UnauthorizedException('API Key fehlt.');
    }

    if (apiKey === this.expectedApiKey) {
      this.logger.log(apiKey);
      this.logger.log(this.expectedApiKey);
      this.logger.log('Valid API Key received.');
      // Optional: Sie könnten hier ein Dummy-Benutzerobjekt an request.user anhängen, falls Ihre Services/Resolver das erwarten.
      // request.user = { id: 'static-api-user', roles: ['admin'] }; 
      return true;
    } else {
      this.logger.warn('Invalid API Key received.');
      throw new UnauthorizedException('Ungültiger API Key.');
    }
  }
}

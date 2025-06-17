import { ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super('jwt', { session: false });
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    this.logger.log('JwtAuthGuard canActivate called.');

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.log('Route is public, access granted.');
      return true;
    }

    this.logger.log(`Context type: ${context.getType()}`);

    if (context.getType<string>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const req = gqlContext.getContext().req;
      
      this.logger.log('Attempting to extract request from GraphQL context.');
      if (req) {
        this.logger.log('Request object extracted from GraphQL context successfully.');
        this.logger.log(`req.user before super.canActivate: ${JSON.stringify(req.user)}`);
      } else {
        this.logger.error('Request object in GraphQL context is UNDEFINED. This is likely the cause of the error.');
        // Wir werfen hier einen Fehler, um zu verhindern, dass super.canActivate mit einem undefinierten req aufgerufen wird,
        // was indirekt zu dem 'logIn'-Problem führt.
        throw new UnauthorizedException('Interner Serverfehler: Request-Kontext für Authentifizierung nicht gefunden.');
      }
    } else if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest();
      this.logger.log('HTTP context detected.');
      if (!req) {
         this.logger.error('Request object in HTTP context is UNDEFINED.');
         throw new UnauthorizedException('Interner Serverfehler: Request-Kontext für Authentifizierung nicht gefunden.');
      }
    }

    this.logger.log('Calling super.canActivate(context) to trigger Passport JWT strategy.');
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context, status) {
    this.logger.log(`handleRequest called. Error: ${err}, User: ${user ? JSON.stringify(user) : 'null'}, Info: ${JSON.stringify(info)}`);
    if (err || !user) {
      this.logger.error(`Authentication failed in handleRequest. Info: ${info?.message || info?.name || 'No specific info'}`);
      // Stellen Sie sicher, dass UnauthorizedException hier verwendet wird, um den Linter-Fehler zu beheben.
      throw err || new UnauthorizedException(`Zugriff verweigert. Token: ${info?.message || info?.name || 'ungültig/abgelaufen/fehlt'}`);
    }
    this.logger.log('User authenticated successfully in handleRequest.');
    return user;
  }
} 
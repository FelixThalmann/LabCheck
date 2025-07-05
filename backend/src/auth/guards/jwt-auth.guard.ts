import { ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * JWT authentication guard
 * Validates JWT tokens for both HTTP and GraphQL contexts
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super('jwt', { session: false });
  }

  /**
   * Validates JWT token from request
   * @param context - Execution context containing request information
   * @returns boolean - true if authentication succeeds, false otherwise
   */
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
        // We throw an error here to prevent super.canActivate from being called with an undefined req,
        // which indirectly causes the 'logIn' problem.
        throw new UnauthorizedException('Internal server error: Request context for authentication not found.');
      }
    } else if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest();
      this.logger.log('HTTP context detected.');
      if (!req) {
         this.logger.error('Request object in HTTP context is UNDEFINED.');
         throw new UnauthorizedException('Internal server error: Request context for authentication not found.');
      }
    }

    this.logger.log('Calling super.canActivate(context) to trigger Passport JWT strategy.');
    return super.canActivate(context);
  }

  /**
   * Handles authentication result
   * @param err - Authentication error if any
   * @param user - Authenticated user object
   * @param info - Additional authentication information
   * @param context - Execution context
   * @param status - HTTP status code
   * @returns any - Authenticated user or throws UnauthorizedException
   */
  handleRequest(err, user, info, context, status) {
    this.logger.log(`handleRequest called. Error: ${err}, User: ${user ? JSON.stringify(user) : 'null'}, Info: ${JSON.stringify(info)}`);
    if (err || !user) {
      this.logger.error(`Authentication failed in handleRequest. Info: ${info?.message || info?.name || 'No specific info'}`);
      // Ensure UnauthorizedException is used here to fix the linter error.
      throw err || new UnauthorizedException(`Access denied. Token: ${info?.message || info?.name || 'invalid/expired/missing'}`);
    }
    this.logger.log('User authenticated successfully in handleRequest.');
    return user;
  }
} 
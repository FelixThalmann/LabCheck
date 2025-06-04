import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User as UserModel } from '@prisma/client'; // Ihr Prisma User-Modell

/**
 * Custom Decorator (@GqlCurrentUser)
 * Extrahiert das Benutzerobjekt aus dem GraphQL-Anforderungskontext.
 * Dieses Benutzerobjekt wird von der JwtStrategy nach erfolgreicher Token-Validierung
 * in `context.req.user` platziert.
 *
 * @returns Das authentifizierte Benutzerobjekt (ohne Passwort) oder undefined, wenn kein Benutzer authentifiziert ist.
 */
export const GqlCurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): Omit<UserModel, 'password'> | undefined => {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    // Die JwtStrategy sollte das User-Objekt (ohne Passwort) an request.user angehängt haben.
    return request.user;
  },
); 
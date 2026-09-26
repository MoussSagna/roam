import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { User } from '../users/user.repository.js';
import { authErrors } from './auth.errors.js';
import { AuthService } from './auth.service.js';
import { bearerToken } from './session-token.js';

/** Who is calling, set by `AuthGuard` on an authenticated request. */
export type AuthContext = { user: User; sessionId: string };

type AuthenticatedRequest = Request & { auth?: AuthContext };

const IS_PUBLIC = 'roam:isPublic';

/** Opens a route (or a whole controller) to unauthenticated calls: health, register, login… */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** The authenticated user, in a handler of a protected route. */
export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): User => {
  const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
  // Only reachable on a route without @Public(): the guard has set it.
  if (!auth) throw authErrors.unauthorized();
  return auth.user;
});

/**
 * Global guard (`APP_GUARD`): **every route requires a session unless it is marked `@Public()`** — a new
 * endpoint is protected by default. It checks the bearer token and exposes the user; it holds no business rule.
 *
 * - no or malformed `Authorization: Bearer` header → 401 `AUTH_UNAUTHORIZED`;
 * - unknown, expired or revoked session → 401 `AUTH_SESSION_INVALID`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request.headers.authorization);
    if (!token) throw authErrors.unauthorized();

    const session = await this.auth.authenticate(token);
    if (!session) throw authErrors.sessionInvalid();

    request.auth = { user: session.user, sessionId: session.sessionId };
    return true;
  }
}

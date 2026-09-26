import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApiException } from '../../common/errors/api-error.js';
import { AuthGuard, type AuthContext, Public } from './auth.guard.js';
import type { AuthService } from './auth.service.js';

const TOKEN = 'a'.repeat(43);

@Public()
class OpenController {
  handler() {}
}

class ProtectedController {
  handler() {}
}

function context(controller: new () => { handler(): void }, authorization?: string) {
  const request: { headers: { authorization?: string }; auth?: AuthContext } = {
    headers: { authorization },
  };
  const ctx = {
    getHandler: () => (controller.prototype as { handler: () => void }).handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

function guard(session: unknown = null) {
  const auth = { authenticate: vi.fn().mockResolvedValue(session) };
  return { auth, guard: new AuthGuard(new Reflector(), auth as unknown as AuthService) };
}

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'passed',
    (error: unknown) => (error instanceof ApiException ? error.code : error),
  );

describe('AuthGuard', () => {
  it('lets a @Public() route through without looking at credentials', async () => {
    const { guard: g, auth } = guard();
    expect(await g.canActivate(context(OpenController).ctx)).toBe(true);
    expect(auth.authenticate).not.toHaveBeenCalled();
  });

  it('protected route without a bearer token → AUTH_UNAUTHORIZED', async () => {
    const { guard: g } = guard();
    expect(await codeOf(g.canActivate(context(ProtectedController).ctx))).toBe('AUTH_UNAUTHORIZED');
    expect(await codeOf(g.canActivate(context(ProtectedController, 'Basic abc').ctx))).toBe(
      'AUTH_UNAUTHORIZED',
    );
  });

  it('unknown or expired session → AUTH_SESSION_INVALID', async () => {
    const { guard: g, auth } = guard(null);
    expect(await codeOf(g.canActivate(context(ProtectedController, `Bearer ${TOKEN}`).ctx))).toBe(
      'AUTH_SESSION_INVALID',
    );
    expect(auth.authenticate).toHaveBeenCalledWith(TOKEN);
  });

  it('valid session → the user is exposed to the handler', async () => {
    const session = { sessionId: 's1', user: { id: 'u1' } };
    const { guard: g } = guard(session);
    const { ctx, request } = context(ProtectedController, `Bearer ${TOKEN}`);

    expect(await g.canActivate(ctx)).toBe(true);
    expect(request.auth).toEqual({ sessionId: 's1', user: { id: 'u1' } });
  });
});

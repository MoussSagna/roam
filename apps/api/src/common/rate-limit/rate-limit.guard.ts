import { type ExecutionContext, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { ApiException, ErrorCode } from '../errors/api-error.js';
import { isSkipped } from './rate-limit.options.js';

/**
 * Global guard (`APP_GUARD`, registered before the AuthGuard): every request is counted before authentication,
 * validation or any query — `@Public()` routes included. Over a limit: **429 `TOO_MANY_REQUESTS`** in the API's error
 * format, with the standard `Retry-After` header (seconds). `@SkipRateLimit()` routes are not counted;
 * `RATE_LIMIT_ENABLED=false` is handled in the options (every tier skipped).
 */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  private readonly rateLimitLogger = new Logger('RateLimit');

  override shouldSkip(context: ExecutionContext): Promise<boolean> {
    return Promise.resolve(isSkipped(context));
  }

  override throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const retryAfterSeconds = detail.timeToBlockExpire;
    http.getResponse<Response>().setHeader('Retry-After', String(retryAfterSeconds));
    // The tier and the route only: never the key, the IP, the token or the body.
    const tier = detail.key.slice(0, detail.key.indexOf(':'));
    this.rateLimitLogger.warn(
      `Rate limit exceeded (${tier}): ${request.method} ${request.originalUrl.split('?')[0]}`,
    );
    return Promise.reject(
      new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        ErrorCode.TooManyRequests,
        'Too many requests: try again later.',
        { retryAfterSeconds },
      ),
    );
  }
}

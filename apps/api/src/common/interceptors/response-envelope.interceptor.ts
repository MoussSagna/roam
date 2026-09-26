import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';

import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator.js';

/** Body of every success response (except `@RawResponse()` endpoints). */
export type SuccessResponseBody<T> = { data: T };

/** Wraps what a handler returns into `{ data }`, so every endpoint answers with the same shape. */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.getAllAndOverride<boolean | undefined>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (raw || context.getType() !== 'http') return next.handle();
    return next
      .handle()
      .pipe(map((data: unknown): SuccessResponseBody<unknown> => ({ data: data ?? null })));
  }
}

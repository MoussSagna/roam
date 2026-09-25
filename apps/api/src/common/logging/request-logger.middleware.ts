import type { LoggerService } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * One line per request once it is answered: method, path (without the query string, which may carry
 * tokens), status and duration. Never the headers or the body. Health probes are logged at debug
 * level so they do not flood the logs.
 */
export function requestLogger(logger: LoggerService) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();
    // The full path (a router may strip its mount prefix from `request.path`), without the query.
    const path = request.originalUrl.split('?')[0];
    response.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const line = `${request.method} ${path} ${response.statusCode} ${ms.toFixed(1)}ms`;
      if (path.startsWith('/health')) logger.debug?.(line, 'HTTP');
      else if (response.statusCode >= 500) logger.error(line, undefined, 'HTTP');
      else if (response.statusCode >= 400) logger.warn(line, 'HTTP');
      else logger.log(line, 'HTTP');
    });
    next();
  };
}

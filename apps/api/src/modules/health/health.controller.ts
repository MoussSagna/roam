import { Controller, Get, HttpStatus, VERSION_NEUTRAL } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RawResponse } from '../../common/decorators/raw-response.decorator.js';
import { ApiException, ErrorCode } from '../../common/errors/api-error.js';
import { PrismaService } from '../../database/prisma.service.js';
import { Public } from '../auth/auth.guard.js';

export type HealthStatus = { status: 'ok' };

/**
 * Infrastructure endpoints, outside the versioned `/api/v1` prefix and the `{ data }` envelope:
 * `GET /health` says the API is up (never depends on the database); `GET /health/database` says
 * whether PostgreSQL answers.
 */
@ApiTags('health')
@Public()
@RawResponse()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'API liveness' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  check(): HealthStatus {
    return { status: 'ok' };
  }

  @Get('database')
  @ApiOperation({ summary: 'Database connectivity' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  @ApiServiceUnavailableResponse({
    schema: {
      example: { error: { code: 'DATABASE_UNAVAILABLE', message: 'The database is unavailable.' } },
    },
  })
  async checkDatabase(): Promise<HealthStatus> {
    if (await this.prisma.isReachable()) return { status: 'ok' };
    throw new ApiException(
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.DatabaseUnavailable,
      'The database is unavailable.',
    );
  }
}

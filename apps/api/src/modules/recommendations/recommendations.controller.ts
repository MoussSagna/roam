import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth.guard.js';
import type { User } from '../users/user.repository.js';
import { RecommendationQuery, RecommendationsResponse } from './dto/recommendation.dto.js';
import { RecommendationsService } from './recommendations.service.js';

const error = (code: string) => ({ schema: { example: { error: { code, message: '…' } } } });

/**
 * `/api/v1/recommendations` — experiences for the signed-in user's context (EXPERIENCE_CATALOG_API.md →
 * "Recommendations"). GET: it reads, changes nothing; the context is in the query string.
 */
@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Recommended experiences for my context',
    description:
      'Context → candidates → hard filters (budget, distance, duration, company) → deterministic ranking → ' +
      'reasons. Missing context is taken from the saved preferences. When nothing fits, constraints are ' +
      'relaxed one by one and listed in `relaxed`.',
  })
  @ApiOkResponse({ type: RecommendationsResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('VALIDATION_ERROR'))
  @ApiUnauthorizedResponse(error('AUTH_UNAUTHORIZED | AUTH_SESSION_INVALID'))
  @ApiServiceUnavailableResponse(error('DATABASE_UNAVAILABLE'))
  async recommend(
    @CurrentUser() me: User,
    @Query() query: RecommendationQuery,
  ): Promise<RecommendationsResponse> {
    return RecommendationsResponse.from(
      await this.recommendations.recommend(me, query.toRequest()),
    );
  }
}

import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {
  ExperienceDetailResponse,
  ExperiencePageResponse,
  ExperienceResponse,
  ListExperiencesQuery,
} from './dto/experience.dto.js';
import { ExperiencesService } from './experiences.service.js';

const error = (code: string) => ({ schema: { example: { error: { code, message: '…' } } } });

/**
 * `/api/v1/experiences` — the catalog (EXPERIENCE_CATALOG_API.md). Signed-in only, like every catalog screen of
 * the mobile app (global AuthGuard).
 */
@ApiTags('experiences')
@ApiBearerAuth()
@ApiUnauthorizedResponse(error('AUTH_UNAUTHORIZED | AUTH_SESSION_INVALID'))
@ApiServiceUnavailableResponse(error('DATABASE_UNAVAILABLE'))
@Controller('experiences')
export class ExperiencesController {
  constructor(private readonly experiences: ExperiencesService) {}

  @Get()
  @ApiOperation({
    summary: 'Active experiences (paginated, filtered)',
    description:
      'Stable order (oldest first). Pagination: `limit` + `cursor` → `{ items, nextCursor }`.',
  })
  @ApiOkResponse({ type: ExperiencePageResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('VALIDATION_ERROR | BAD_REQUEST'))
  async list(@Query() query: ListExperiencesQuery): Promise<ExperiencePageResponse> {
    const page = await this.experiences.list(query);
    return {
      items: page.items.map((item) => ExperienceResponse.from(item)),
      nextCursor: page.nextCursor,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'An experience with its ordered places' })
  @ApiOkResponse({ type: ExperienceDetailResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('BAD_REQUEST'))
  @ApiNotFoundResponse(error('NOT_FOUND'))
  async get(@Param('id', new ParseUUIDPipe()) id: string): Promise<ExperienceDetailResponse> {
    return ExperienceDetailResponse.fromDetail(await this.experiences.get(id));
  }
}

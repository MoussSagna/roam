import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth.guard.js';
import type { User } from '../users/user.repository.js';
import {
  CreateJourneyDto,
  JourneyPageResponse,
  JourneyResponse,
  ListJourneysQuery,
  ProgressJourneyDto,
  UpdateJourneyDto,
} from './dto/journey.dto.js';
import { JourneysService } from './journeys.service.js';

const error = (code: string) => ({ schema: { example: { error: { code, message: '…' } } } });
const UUID = new ParseUUIDPipe();

/**
 * `/api/v1/journeys` — the signed-in user's journeys (JOURNEY_API.md). Protected by the global AuthGuard; the user
 * always comes from the session (`@CurrentUser()`): no route or body takes a user id, and another user's journey is
 * answered 404.
 */
@ApiTags('journeys')
@ApiBearerAuth()
@ApiUnauthorizedResponse(error('AUTH_UNAUTHORIZED | AUTH_SESSION_INVALID'))
@ApiServiceUnavailableResponse(error('DATABASE_UNAVAILABLE'))
@Controller('journeys')
export class JourneysController {
  constructor(private readonly journeys: JourneysService) {}

  @Get('active')
  @ApiOperation({
    summary: 'My active journey',
    description:
      '`{ data: null }` when there is none (the hub then shows the history or its empty state).',
  })
  @ApiOkResponse({ type: JourneyResponse, description: 'In `{ data }`; `null` when none.' })
  async active(@CurrentUser() me: User): Promise<JourneyResponse | null> {
    const journey = await this.journeys.getActive(me);
    return journey && JourneyResponse.from(journey);
  }

  @Get()
  @ApiOperation({
    summary: 'My completed journeys (history)',
    description:
      'Most recently completed first. Pagination: `limit` + `cursor` → `{ items, nextCursor }`.',
  })
  @ApiOkResponse({ type: JourneyPageResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('VALIDATION_ERROR | BAD_REQUEST'))
  async list(
    @CurrentUser() me: User,
    @Query() query: ListJourneysQuery,
  ): Promise<JourneyPageResponse> {
    const page = await this.journeys.listCompleted(me, {
      limit: query.limit,
      cursor: query.cursor,
    });
    return {
      items: page.items.map((item) => JourneyResponse.from(item)),
      nextCursor: page.nextCursor,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'One of my journeys (active or completed)' })
  @ApiOkResponse({ type: JourneyResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('BAD_REQUEST'))
  @ApiNotFoundResponse(error('NOT_FOUND'))
  async get(@CurrentUser() me: User, @Param('id', UUID) id: string): Promise<JourneyResponse> {
    return JourneyResponse.from(await this.journeys.get(me, id));
  }

  @Post()
  @ApiOperation({
    summary: 'Create my journey ("Créer mon parcours")',
    description:
      'From the creation flow’s draft: created **active** and started at its first step (a draft is never saved). ' +
      'The server plans it (arrivals, travel, totals). One active journey at a time.',
  })
  @ApiCreatedResponse({ type: JourneyResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('VALIDATION_ERROR'))
  @ApiConflictResponse(error('JOURNEY_ALREADY_ACTIVE'))
  @ApiUnprocessableEntityResponse(error('JOURNEY_EXPERIENCE_UNAVAILABLE'))
  async create(@CurrentUser() me: User, @Body() body: CreateJourneyDto): Promise<JourneyResponse> {
    return JourneyResponse.from(await this.journeys.create(me, body.toDraft()));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit the steps of my active journey',
    description:
      'Replaces the ordered steps (atomic); the journey is replanned and keeps its status; the current experience ' +
      'stays current wherever it moved.',
  })
  @ApiOkResponse({ type: JourneyResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('VALIDATION_ERROR | BAD_REQUEST'))
  @ApiNotFoundResponse(error('NOT_FOUND'))
  @ApiConflictResponse(error('JOURNEY_NOT_ACTIVE | JOURNEY_INVALID_STEP'))
  @ApiUnprocessableEntityResponse(error('JOURNEY_EXPERIENCE_UNAVAILABLE'))
  async update(
    @CurrentUser() me: User,
    @Param('id', UUID) id: string,
    @Body() body: UpdateJourneyDto,
  ): Promise<JourneyResponse> {
    return JourneyResponse.from(await this.journeys.updateSteps(me, id, body.experienceIds));
  }

  @Post(':id/progress')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Move on to the next step ("Continuer mon parcours")',
    description:
      '`currentStep` must be the next step (or the current one again: no change). The last step is finished with ' +
      '`POST /journeys/:id/complete`.',
  })
  @ApiOkResponse({ type: JourneyResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('VALIDATION_ERROR | BAD_REQUEST'))
  @ApiNotFoundResponse(error('NOT_FOUND'))
  @ApiConflictResponse(error('JOURNEY_NOT_ACTIVE | JOURNEY_INVALID_STEP'))
  async progress(
    @CurrentUser() me: User,
    @Param('id', UUID) id: string,
    @Body() body: ProgressJourneyDto,
  ): Promise<JourneyResponse> {
    return JourneyResponse.from(await this.journeys.progress(me, id, body.currentStep));
  }

  @Post(':id/complete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Complete my journey ("Terminer le parcours")',
    description: 'From its last step: active → completed, once; `completedAt` set by the server.',
  })
  @ApiOkResponse({ type: JourneyResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('BAD_REQUEST'))
  @ApiNotFoundResponse(error('NOT_FOUND'))
  @ApiConflictResponse(error('JOURNEY_NOT_ACTIVE | JOURNEY_INVALID_STEP'))
  async complete(@CurrentUser() me: User, @Param('id', UUID) id: string): Promise<JourneyResponse> {
    return JourneyResponse.from(await this.journeys.complete(me, id));
  }
}

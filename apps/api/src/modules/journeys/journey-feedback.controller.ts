import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
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
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth.guard.js';
import type { User } from '../users/user.repository.js';
import { CreateJourneyFeedbackDto, JourneyFeedbackResponse } from './dto/journey-feedback.dto.js';
import { JourneyFeedbackService } from './journey-feedback.service.js';

const error = (code: string) => ({ schema: { example: { error: { code, message: '…' } } } });

/**
 * `/api/v1/journeys/:id/feedback` — the feedback of one of my completed journeys (JOURNEY_FEEDBACK_API.md). Global
 * AuthGuard; the author is the session user; another user's journey is 404. No edit, no delete: none is documented.
 */
@ApiTags('journeys')
@ApiBearerAuth()
@ApiUnauthorizedResponse(error('AUTH_UNAUTHORIZED | AUTH_SESSION_INVALID'))
@ApiServiceUnavailableResponse(error('DATABASE_UNAVAILABLE'))
@ApiBadRequestResponse(error('BAD_REQUEST'))
@ApiNotFoundResponse(error('NOT_FOUND'))
@Controller('journeys/:id/feedback')
export class JourneyFeedbackController {
  constructor(private readonly feedback: JourneyFeedbackService) {}

  @Get()
  @ApiOperation({
    summary: 'The feedback of one of my journeys',
    description:
      '`{ data: null }` when none was given (skipped, not yet, or the journey is still active).',
  })
  @ApiOkResponse({ type: JourneyFeedbackResponse, description: 'In `{ data }`; `null` when none.' })
  async get(
    @CurrentUser() me: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<JourneyFeedbackResponse | null> {
    const feedback = await this.feedback.get(me, id);
    return feedback && JourneyFeedbackResponse.from(feedback);
  }

  @Post()
  @ApiOperation({
    summary: 'Give the feedback of my completed journey ("Envoyer mon avis")',
    description:
      'Once per journey, only when it is completed. "Passer" sends nothing. A second submission is refused (409) ' +
      'with the saved feedback in `error.details.feedback`.',
  })
  @ApiCreatedResponse({ type: JourneyFeedbackResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('VALIDATION_ERROR | BAD_REQUEST'))
  @ApiConflictResponse(error('JOURNEY_NOT_COMPLETED | JOURNEY_FEEDBACK_ALREADY_EXISTS'))
  async create(
    @CurrentUser() me: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateJourneyFeedbackDto,
  ): Promise<JourneyFeedbackResponse> {
    return JourneyFeedbackResponse.from(
      await this.feedback.create(me, id, { rating: body.rating, comment: body.comment ?? null }),
    );
  }
}

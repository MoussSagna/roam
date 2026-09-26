import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import {
  JOURNEY_FEEDBACK_COMMENT_MAX_LENGTH,
  JOURNEY_FEEDBACK_RATING,
} from '../../../database/domain-constraints.js';
import type { JourneyFeedback } from '../journey.types.js';
import { toPublic } from '../journey-feedback.service.js';

/**
 * Bodies of `/api/v1/journeys/:id/feedback` (JOURNEY_FEEDBACK_API.md) — the mobile `JourneyFeedback` contract (D-83):
 * 1–5 stars, an optional comment of at most 300 characters, trimmed, blank saved as `null`. The journey, the author,
 * the id and the date come from the server: any other field is refused (400). Examples are fictional.
 */

/** Trims a string; a blank one becomes `null` (mobile `submitJourneyFeedback`). Anything else is left to validation. */
const blankToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export class CreateJourneyFeedbackDto {
  @ApiProperty({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'Stars, an integer from 1 to 5.',
  })
  @IsInt()
  @Min(JOURNEY_FEEDBACK_RATING.min)
  @Max(JOURNEY_FEEDBACK_RATING.max)
  rating!: number;

  @ApiProperty({
    example: 'Super balade, le rooftop valait le détour.',
    required: false,
    nullable: true,
    type: String,
    description: `Optional, ≤ ${JOURNEY_FEEDBACK_COMMENT_MAX_LENGTH} characters once trimmed; blank or absent → null.`,
  })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(JOURNEY_FEEDBACK_COMMENT_MAX_LENGTH)
  comment?: string | null;
}

export class JourneyFeedbackResponse {
  @ApiProperty({ example: '01a0db2f-0000-7000-8000-0000000000fb' }) id!: string;
  @ApiProperty({ example: '01a0db2f-0000-7000-8000-0000000000f1' }) journeyId!: string;
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 }) rating!: number;
  @ApiProperty({ nullable: true, type: String, example: 'Super balade.' }) comment!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;

  static from(feedback: JourneyFeedback): JourneyFeedbackResponse {
    return toPublic(feedback);
  }
}

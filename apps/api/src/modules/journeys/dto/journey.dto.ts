import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import type {
  JourneyBudget,
  JourneyDuration,
  JourneyMood,
  JourneyStartKind,
} from '../../../generated/prisma/enums.js';
import { ExperienceResponse } from '../../experiences/dto/experience.dto.js';
import type { JourneyDetail, JourneyDraft, JourneyStepDetail } from '../journeys.service.js';

/**
 * Bodies of `/api/v1/journeys` (JOURNEY_API.md). The shapes and vocabularies are the mobile app's own (`Journey`,
 * `JourneyDraft` in `apps/mobile/src/types/journey.ts`: `2h`, `halfDay`, `free`…); mapping them to the database
 * enums belongs here. What the server controls — owner, status, progress, plan, timestamps — is never accepted:
 * an unknown field is refused (400). Limits on lengths and list sizes are technical bounds, not product rules.
 * Examples are fictional.
 */

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const toInt = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number(value);

const reverse = <K extends string, V extends string>(map: Record<K, V>) =>
  Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key])) as Record<V, K>;

/** mobile `JourneyMood` ↔ database `JourneyMood` (JOURNEY.md). */
const MOOD = {
  calm: 'CALM',
  discover: 'DISCOVER',
  food: 'FOOD',
  culture: 'CULTURE',
  energetic: 'ENERGETIC',
  romantic: 'ROMANTIC',
  festive: 'FESTIVE',
} as const satisfies Record<string, JourneyMood>;

/** mobile `JourneyDuration`: 1h | 2h | 3h | halfDay | day. */
const DURATION = {
  '1h': 'ONE_HOUR',
  '2h': 'TWO_HOURS',
  '3h': 'THREE_HOURS',
  halfDay: 'HALF_DAY',
  day: 'DAY',
} as const satisfies Record<string, JourneyDuration>;

/** mobile `JourneyBudget`: free | € | €€ | €€€. */
const BUDGET = {
  free: 'FREE',
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
} as const satisfies Record<string, JourneyBudget>;

/** mobile `JourneyStartKind`. */
const START_KIND = {
  current: 'CURRENT',
  place: 'PLACE',
  address: 'ADDRESS',
  experience: 'EXPERIENCE',
} as const satisfies Record<string, JourneyStartKind>;

type Keys<T> = (keyof T & string)[];
const MOODS = Object.keys(MOOD) as Keys<typeof MOOD>;
const DURATIONS = Object.keys(DURATION) as Keys<typeof DURATION>;
const BUDGETS = Object.keys(BUDGET) as Keys<typeof BUDGET>;
const START_KINDS = Object.keys(START_KIND) as Keys<typeof START_KIND>;
const MOOD_VALUE = reverse(MOOD);
const DURATION_VALUE = reverse(DURATION);
const BUDGET_VALUE = reverse(BUDGET);
const START_KIND_VALUE = reverse(START_KIND);

/** At most this many steps in one journey (a technical bound). */
export const MAX_JOURNEY_STEPS = 20;

// ─── Requests ──────────────────────────────────────────────────────────────────────────────────────

export class CoordinatesDto {
  @ApiProperty({ example: 48.8674 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 2.3637 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsLongitude()
  longitude!: number;
}

export class JourneyContextDto {
  @ApiProperty({ enum: MOODS, example: 'calm' })
  @IsIn(MOODS)
  mood!: keyof typeof MOOD;

  @ApiProperty({ enum: DURATIONS, example: '2h' })
  @IsIn(DURATIONS)
  duration!: keyof typeof DURATION;

  @ApiProperty({ enum: BUDGETS, example: 'low' })
  @IsIn(BUDGETS)
  budget!: keyof typeof BUDGET;
}

export class StartLocationDto {
  @ApiProperty({ enum: START_KINDS, example: 'place' })
  @IsIn(START_KINDS)
  kind!: keyof typeof START_KIND;

  @ApiProperty({ example: 'République', description: 'Display label, 1–100 characters.' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  label!: string;

  @ApiPropertyOptional({
    example: '12 place de la République, 75011 Paris',
    nullable: true,
    type: String,
    description: 'Secondary line (the experience’s address for `experience`), ≤ 200 characters.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  detail?: string | null;

  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates!: CoordinatesDto;
}

const EXPERIENCE_IDS = [
  IsArray(),
  ArrayMinSize(1, { message: 'a journey needs at least one experience' }),
  ArrayMaxSize(MAX_JOURNEY_STEPS),
  IsUUID('all', { each: true, message: 'each experienceId must be a UUID' }),
];
function apply(...decorators: PropertyDecorator[]): PropertyDecorator {
  return (target, key) => decorators.forEach((decorator) => decorator(target, key));
}

/** "Créer mon parcours": the mobile `JourneyDraft` plus the title the app displays. */
export class CreateJourneyDto {
  @ApiProperty({
    example: 'Parcours calme',
    description: '1–100 characters (the app localizes it).',
  })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  title!: string;

  @ApiProperty({ type: JourneyContextDto })
  @ValidateNested()
  @Type(() => JourneyContextDto)
  context!: JourneyContextDto;

  @ApiProperty({ type: StartLocationDto })
  @ValidateNested()
  @Type(() => StartLocationDto)
  startLocation!: StartLocationDto;

  @ApiProperty({ example: '14:30', description: 'Local "HH:MM" (no timezone, like the app).' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be "HH:MM" (00:00–23:59)' })
  startTime!: string;

  @ApiProperty({
    type: [String],
    example: ['01a0db2f-0000-7000-8000-00000000000a'],
    description: `Ordered catalog experiences, 1–${MAX_JOURNEY_STEPS}; a repeated id is kept once.`,
  })
  @apply(...EXPERIENCE_IDS)
  experienceIds!: string[];

  toDraft(): JourneyDraft {
    const { kind, label, detail, coordinates } = this.startLocation;
    return {
      title: this.title,
      mood: MOOD[this.context.mood],
      duration: DURATION[this.context.duration],
      budget: BUDGET[this.context.budget],
      startLocation: {
        kind: START_KIND[kind],
        label,
        detail: detail ?? null,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
      startTime: this.startTime,
      experienceIds: this.experienceIds,
    };
  }
}

/** "Enregistrer" in the edit screen: the new ordered steps; the journey is replanned by the server. */
export class UpdateJourneyDto {
  @ApiProperty({
    type: [String],
    example: ['01a0db2f-0000-7000-8000-00000000000a', '01a0db2f-0000-7000-8000-00000000000b'],
    description: `Ordered catalog experiences, 1–${MAX_JOURNEY_STEPS}; a repeated id is kept once.`,
  })
  @apply(...EXPERIENCE_IDS)
  experienceIds!: string[];
}

/** "Continuer mon parcours": the step that becomes current — the next one (or the current one again: a no-op). */
export class ProgressJourneyDto {
  @ApiProperty({ example: 1, description: '0-based index of the step that becomes current.' })
  @IsInt()
  @Min(0)
  @Max(MAX_JOURNEY_STEPS - 1)
  currentStep!: number;
}

export class ListJourneysQuery {
  @ApiPropertyOptional({ example: 20, description: '1–100, default 20.' })
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: '`nextCursor` of the previous page.' })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}

// ─── Responses ─────────────────────────────────────────────────────────────────────────────────────

export class JourneyContextResponse {
  @ApiProperty({ enum: MOODS, example: 'calm' }) mood!: string;
  @ApiProperty({ enum: DURATIONS, example: '2h' }) duration!: string;
  @ApiProperty({ enum: BUDGETS, example: 'low' }) budget!: string;
}

export class CoordinatesResponse {
  @ApiProperty({ example: 48.8674 }) latitude!: number;
  @ApiProperty({ example: 2.3637 }) longitude!: number;
}

export class StartLocationResponse {
  @ApiProperty({ enum: START_KINDS, example: 'place' }) kind!: string;
  @ApiProperty({ example: 'République' }) label!: string;
  @ApiProperty({ nullable: true, type: String }) detail!: string | null;
  @ApiProperty({ type: CoordinatesResponse }) coordinates!: CoordinatesResponse;
}

export class JourneyStepResponse {
  @ApiProperty({ example: '01a0db2f-0000-7000-8000-00000000000a' }) experienceId!: string;
  @ApiProperty({ example: 0, description: '0-based position.' }) order!: number;
  @ApiProperty({ example: '14:38', description: '"HH:MM", from the start time.' })
  estimatedArrival!: string;
  @ApiProperty({ example: 120 }) estimatedDurationMin!: number;
  @ApiProperty({ example: 8, description: 'From the previous step (or the start).' })
  travelDurationMin!: number;
  @ApiProperty({ example: 640 }) travelDistanceM!: number;
  @ApiProperty({ enum: ['walk', 'metro'], example: 'walk' }) travelMode!: string;
  @ApiProperty({
    type: ExperienceResponse,
    description: 'The canonical catalog experience (coordinates for the map).',
  })
  experience!: ExperienceResponse;

  static from(step: JourneyStepDetail): JourneyStepResponse {
    return {
      experienceId: step.experienceId,
      order: step.order,
      estimatedArrival: step.estimatedArrival,
      estimatedDurationMin: step.estimatedDurationMin,
      travelDurationMin: step.travelDurationMin,
      travelDistanceM: step.travelDistanceM,
      travelMode: step.travelMode === 'METRO' ? 'metro' : 'walk',
      experience: ExperienceResponse.from(step.experience),
    };
  }
}

/** The mobile `Journey`, with each step's experience. Never the owner id. */
export class JourneyResponse {
  @ApiProperty({ example: '01a0db2f-0000-7000-8000-0000000000f1' }) id!: string;
  @ApiProperty({ enum: ['active', 'completed'], example: 'active' }) status!: string;
  @ApiProperty({ example: 'Parcours calme' }) title!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: JourneyContextResponse }) context!: JourneyContextResponse;
  @ApiProperty({ type: StartLocationResponse }) startLocation!: StartLocationResponse;
  @ApiProperty({ example: '14:30' }) startTime!: string;
  @ApiProperty({ example: '18:05' }) endTime!: string;
  @ApiProperty({ example: 215 }) estimatedDurationMin!: number;
  @ApiProperty({ example: 26, description: 'Euros, estimated from the budget brackets.' })
  estimatedBudgetEur!: number;
  @ApiProperty({ example: 2480 }) totalDistanceM!: number;
  @ApiProperty({ type: [JourneyStepResponse] }) steps!: JourneyStepResponse[];
  @ApiProperty({ example: 0, description: '0-based index of the step in progress.' })
  currentStep!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) startedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) completedAt!: string | null;

  static from(journey: JourneyDetail): JourneyResponse {
    return {
      id: journey.id,
      status: journey.status === 'COMPLETED' ? 'completed' : 'active',
      title: journey.title,
      createdAt: journey.createdAt.toISOString(),
      context: {
        mood: MOOD_VALUE[journey.mood],
        duration: DURATION_VALUE[journey.duration],
        budget: BUDGET_VALUE[journey.budget],
      },
      startLocation: {
        kind: START_KIND_VALUE[journey.startLocation.kind],
        label: journey.startLocation.label,
        detail: journey.startLocation.detail,
        coordinates: {
          latitude: journey.startLocation.latitude,
          longitude: journey.startLocation.longitude,
        },
      },
      startTime: journey.startTime,
      endTime: journey.endTime,
      estimatedDurationMin: journey.estimatedDurationMin,
      estimatedBudgetEur: journey.estimatedBudgetEur,
      totalDistanceM: journey.totalDistanceM,
      steps: journey.steps.map((step) => JourneyStepResponse.from(step)),
      currentStep: journey.currentStep,
      startedAt: journey.startedAt?.toISOString() ?? null,
      completedAt: journey.completedAt?.toISOString() ?? null,
    };
  }
}

export class JourneyPageResponse {
  @ApiProperty({ type: [JourneyResponse] }) items!: JourneyResponse[];
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Pass as `cursor`; null on the last page.',
  })
  nextCursor!: string | null;
}

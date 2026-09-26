import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

import type { JsonValue } from '../../../database/json.js';
import type {
  Enrichment,
  Experience,
  ExperienceDetail,
  Place,
} from '../../catalog/catalog.types.js';
import { apiValue, type Budget, BUDGETS } from '../api-values.js';

/**
 * Bodies of `/api/v1/experiences` (EXPERIENCE_CATALOG_API.md). Provider facts sit at the top level; everything ROAM
 * derived is grouped under `roam` (DATA_RULES.md: a ROAM inference is never presented as a provider fact).
 * Examples are fictional.
 */

const toInt = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number(value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// ─── Query ─────────────────────────────────────────────────────────────────────────────────────────

export class ListExperiencesQuery {
  @ApiPropertyOptional({ example: 'culture', description: 'Category slug.' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,50}$/, { message: 'category must be a category slug' })
  category?: string;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional({
    enum: BUDGETS,
    description: 'Keeps what fits the bracket (or has no known price).',
  })
  @IsOptional()
  @IsIn(BUDGETS)
  budget?: Budget;

  @ApiPropertyOptional({
    example: 'rooftop',
    description: 'Text in the title or description (2–100).',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  q?: string;

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

export class CoordinatesResponse {
  @ApiProperty({ example: 48.8606 }) latitude!: number;
  @ApiProperty({ example: 2.3376 }) longitude!: number;
}

/** ROAM-owned context (RoamEnrichment): derived, never a provider fact. */
export class RoamContextResponse {
  @ApiProperty({ example: ['cozy'], type: [String] }) atmosphere!: string[];
  @ApiProperty({ example: 'low', enum: ['low', 'medium', 'high', 'unknown'] }) energyLevel!: string;
  @ApiProperty({ example: ['couple', 'friends'], type: [String] }) suitableFor!: string[];
  @ApiProperty({ example: ['afternoon'], type: [String] }) bestMoments!: string[];
  @ApiProperty({ example: ['terrasse'], type: [String] }) tags!: string[];
  @ApiProperty({ example: 90, nullable: true, type: Number }) estimatedDurationMin!: number | null;
  @ApiProperty({
    example: true,
    description: 'The duration was inferred, not given by a provider.',
  })
  durationIsDerived!: boolean;
  @ApiProperty({ example: 'roamRules', enum: ['roamRules', 'curated', 'userFeedback'] })
  source!: string;

  static from(enrichment: Enrichment | null): RoamContextResponse | null {
    if (!enrichment) return null;
    return {
      atmosphere: enrichment.atmosphere,
      energyLevel: apiValue(enrichment.energyLevel),
      suitableFor: enrichment.suitableFor.map(apiValue),
      bestMoments: enrichment.bestMoments.map(apiValue),
      tags: enrichment.tags,
      estimatedDurationMin: enrichment.estimatedDurationMin,
      durationIsDerived: enrichment.durationIsDerived,
      source: apiValue(enrichment.source),
    };
  }
}

const coordinates = (latitude: number | null, longitude: number | null) =>
  latitude === null || longitude === null ? null : { latitude, longitude };

export class PlaceResponse {
  @ApiProperty({ example: '01a0db2f-0000-7000-8000-000000000001' }) id!: string;
  @ApiProperty({ example: 'Café des Arts' }) name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ example: '12 rue de Rivoli, 75004 Paris', nullable: true, type: String })
  address!: string | null;
  @ApiProperty({ example: 'Paris', nullable: true, type: String }) city!: string | null;
  @ApiProperty({ type: CoordinatesResponse }) coordinates!: CoordinatesResponse;
  @ApiProperty({ type: [String] }) photos!: string[];
  @ApiProperty({
    nullable: true,
    description: 'As normalized from the provider (structure varies).',
  })
  openingHours!: JsonValue | null;
  @ApiProperty({ example: 'low' }) priceLevel!: string;
  @ApiProperty({ example: 4.5, nullable: true, type: Number }) rating!: number | null;
  @ApiProperty({ example: 120, nullable: true, type: Number }) reviewCount!: number | null;
  @ApiProperty({ example: ['cafe'], type: [String] }) categories!: string[];
  @ApiProperty({ type: RoamContextResponse, nullable: true }) roam!: RoamContextResponse | null;

  static from(place: Place): PlaceResponse {
    return {
      id: place.id,
      name: place.name,
      description: place.description,
      address: place.address,
      city: place.city,
      coordinates: { latitude: place.latitude, longitude: place.longitude },
      photos: place.photos,
      openingHours: place.openingHours,
      priceLevel: apiValue(place.priceLevel),
      rating: place.rating,
      reviewCount: place.reviewCount,
      categories: place.categorySlugs,
      roam: RoamContextResponse.from(place.enrichment),
    };
  }
}

/** An experience in a list (cards). */
export class ExperienceResponse {
  @ApiProperty({ example: '01a0db2f-0000-7000-8000-00000000000a' }) id!: string;
  @ApiProperty({ example: 'Musée puis café au Marais' }) title!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ example: ['culture'], type: [String] }) categories!: string[];
  @ApiProperty({ example: 'Paris', nullable: true, type: String }) city!: string | null;
  @ApiProperty({ nullable: true, type: String }) address!: string | null;
  @ApiProperty({ type: CoordinatesResponse, nullable: true })
  coordinates!: CoordinatesResponse | null;
  @ApiProperty({ nullable: true, type: String }) coverImage!: string | null;
  @ApiProperty({ type: [String] }) images!: string[];
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) startDate!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) endDate!: string | null;
  @ApiProperty({ nullable: true }) openingHours!: JsonValue | null;
  @ApiProperty({
    example: 'medium',
    enum: ['free', 'low', 'medium', 'high', 'veryHigh', 'unknown'],
  })
  priceLevel!: string;
  @ApiProperty({ example: 12.5, nullable: true, type: Number }) priceMin!: number | null;
  @ApiProperty({ example: 25, nullable: true, type: Number }) priceMax!: number | null;
  @ApiProperty({ example: 'EUR', nullable: true, type: String }) currency!: string | null;
  @ApiProperty({ example: 4.6, nullable: true, type: Number }) rating!: number | null;
  @ApiProperty({ example: 230, nullable: true, type: Number }) reviewCount!: number | null;
  @ApiProperty({ description: 'The ordered places it is made of.', type: [String] })
  placeIds!: string[];
  @ApiProperty({ description: 'false: no longer offered (kept for history, favorites, journeys).' })
  isActive!: boolean;
  @ApiProperty({ type: RoamContextResponse, nullable: true }) roam!: RoamContextResponse | null;

  static from(experience: Experience): ExperienceResponse {
    return {
      id: experience.id,
      title: experience.title,
      description: experience.description,
      categories: experience.categorySlugs,
      city: experience.city,
      address: experience.address,
      coordinates: coordinates(experience.latitude, experience.longitude),
      coverImage: experience.coverImage,
      images: experience.images,
      startDate: experience.startDate?.toISOString() ?? null,
      endDate: experience.endDate?.toISOString() ?? null,
      openingHours: experience.openingHours,
      priceLevel: apiValue(experience.priceLevel),
      priceMin: experience.priceMin,
      priceMax: experience.priceMax,
      currency: experience.currency,
      rating: experience.rating,
      reviewCount: experience.reviewCount,
      placeIds: experience.placeIds,
      isActive: experience.isActive,
      roam: RoamContextResponse.from(experience.enrichment),
    };
  }
}

/** The detail screen: the experience with its ordered places. */
export class ExperienceDetailResponse extends ExperienceResponse {
  @ApiProperty({ type: [PlaceResponse] }) places!: PlaceResponse[];

  static fromDetail(experience: ExperienceDetail): ExperienceDetailResponse {
    return {
      ...ExperienceResponse.from(experience),
      places: experience.places.map((place) => PlaceResponse.from(place)),
    };
  }
}

export class ExperiencePageResponse {
  @ApiProperty({ type: [ExperienceResponse] }) items!: ExperienceResponse[];
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Pass as `cursor`; null on the last page.',
  })
  nextCursor!: string | null;
}

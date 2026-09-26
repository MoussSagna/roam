import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateBy,
  ValidateIf,
} from 'class-validator';

import { type Budget, BUDGETS } from '../../experiences/api-values.js';
import { CoordinatesResponse, ExperienceResponse } from '../../experiences/dto/experience.dto.js';
import type {
  AppliedContext,
  Company,
  Constraint,
  Reason,
  RecommendationRequest,
  Recommendations,
} from '../recommendations.service.js';

const toNumber = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number(value);

const COMPANIES: Company[] = ['alone', 'couple', 'friends', 'family'];
const REASONS: Reason[] = ['nearby', 'budget', 'duration', 'company'];
const CONSTRAINTS: Constraint[] = ['budget', 'distance', 'duration', 'company'];

/**
 * The user's context for now (RECOMMENDATION.md → "User context"), as query parameters. Every field is optional;
 * the saved preferences fill budget, distance and company when absent. No user id: the user is the session's.
 */
export class RecommendationQuery {
  @ApiPropertyOptional({ example: 48.8566, description: 'With `longitude`: where the user is.' })
  @ValidateIf(
    (query: RecommendationQuery) => query.latitude !== undefined || query.longitude !== undefined,
  )
  @Transform(toNumber)
  @IsLatitude({ message: 'latitude and longitude go together; latitude must be a latitude' })
  latitude?: number;

  @ApiPropertyOptional({ example: 2.3522 })
  @ValidateIf(
    (query: RecommendationQuery) => query.latitude !== undefined || query.longitude !== undefined,
  )
  @Transform(toNumber)
  @IsLongitude({ message: 'latitude and longitude go together; longitude must be a longitude' })
  longitude?: number;

  @ApiPropertyOptional({ example: 5, description: '1–50 km; needs a location.' })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(50)
  @ValidateBy({
    name: 'needsLocation',
    validator: {
      validate: (_: unknown, args) => (args?.object as RecommendationQuery).latitude !== undefined,
      defaultMessage: () => 'maxDistanceKm needs latitude and longitude',
    },
  })
  maxDistanceKm?: number;

  @ApiPropertyOptional({ enum: BUDGETS })
  @IsOptional()
  @IsIn(BUDGETS)
  budget?: Budget;

  @ApiPropertyOptional({ example: 120, description: 'Available time, 15–1440 minutes.' })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(15)
  @Max(1440)
  availableMinutes?: number;

  @ApiPropertyOptional({ enum: COMPANIES })
  @IsOptional()
  @IsIn(COMPANIES)
  company?: Company;

  @ApiPropertyOptional({ example: 'culture', description: 'Category slug.' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,50}$/, { message: 'category must be a category slug' })
  category?: string;

  @ApiPropertyOptional({ example: 10, description: '1–20, default 10.' })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  toRequest(): RecommendationRequest {
    return {
      location:
        this.latitude !== undefined && this.longitude !== undefined
          ? { latitude: this.latitude, longitude: this.longitude }
          : undefined,
      maxDistanceKm: this.maxDistanceKm,
      budget: this.budget,
      availableMinutes: this.availableMinutes,
      company: this.company,
      category: this.category,
      limit: this.limit,
    };
  }
}

export class AppliedContextResponse {
  @ApiProperty({ type: CoordinatesResponse, nullable: true }) location!: CoordinatesResponse | null;
  @ApiProperty({ nullable: true, type: Number }) maxDistanceKm!: number | null;
  @ApiProperty({ enum: BUDGETS, nullable: true }) budget!: Budget | null;
  @ApiProperty({ nullable: true, type: Number }) availableMinutes!: number | null;
  @ApiProperty({ enum: COMPANIES, nullable: true }) company!: Company | null;
  @ApiProperty({ nullable: true, type: String }) category!: string | null;
  @ApiProperty({
    enum: ['budget', 'maxDistanceKm', 'company'],
    isArray: true,
    description: 'The values taken from the saved preferences.',
  })
  fromPreferences!: AppliedContext['fromPreferences'];
}

export class RecommendationItemResponse {
  @ApiProperty({ type: ExperienceResponse }) experience!: ExperienceResponse;
  @ApiProperty({
    example: 850,
    nullable: true,
    type: Number,
    description: 'Straight line, when known.',
  })
  distanceM!: number | null;
  @ApiProperty({
    enum: REASONS,
    isArray: true,
    description: 'Constraints the experience actually matched — for a human "why" line.',
  })
  reasons!: Reason[];
}

export class RecommendationsResponse {
  @ApiProperty({ type: AppliedContextResponse }) context!: AppliedContextResponse;
  @ApiProperty({ type: [RecommendationItemResponse] }) items!: RecommendationItemResponse[];
  @ApiProperty({
    enum: CONSTRAINTS,
    isArray: true,
    description: 'Empty: a perfect match. Otherwise the constraints dropped to find alternatives.',
  })
  relaxed!: Constraint[];

  static from(result: Recommendations): RecommendationsResponse {
    return {
      context: result.context,
      items: result.items.map((item) => ({
        experience: ExperienceResponse.from(item.experience),
        distanceM: item.distanceM,
        reasons: item.reasons,
      })),
      relaxed: result.relaxed,
    };
  }
}

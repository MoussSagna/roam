import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import type { BudgetRange, Company } from '../../../generated/prisma/enums.js';
import type {
  User,
  UserPreference,
  UserPreferenceChange,
  UserProfileChange,
} from '../user.repository.js';

/**
 * Bodies of `/api/v1/users/me*` (USER_PROFILE_AND_PREFERENCES.md). The vocabularies are the mobile app's own
 * values (`under10`, `alone`…): mapping them to the database enums belongs here, in the API layer
 * (DATABASE_SCHEMA.md → conventions). Length and size limits are technical bounds, not product rules.
 */

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimAll = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? (value as unknown[]).map((item) => (typeof item === 'string' ? item.trim() : item))
    : value;

// ─── Profile ───────────────────────────────────────────────────────────────────────────────────────

/** The public view of a user: what the mobile `User` type holds. Never credentials, never timestamps. */
export class UserResponse {
  @ApiProperty({ example: '01a0db2f-89ae-7189-8984-1a667beee5bb' }) id!: string;
  @ApiProperty({ example: 'lea@example.com' }) email!: string;
  @ApiProperty({ example: 'Léa' }) displayName!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl!: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) age!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) city!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) bio!: string | null;

  static from(user: User): UserResponse {
    const { id, email, displayName, avatarUrl, age, city, bio } = user;
    return { id, email, displayName, avatarUrl, age, city, bio };
  }
}

/**
 * The editable profile fields — all optional (a partial update); `null` clears an optional field. Not the
 * email: changing it needs an address verification that does not exist yet (USER_PROFILE_AND_PREFERENCES.md).
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Léa', description: '1–50 characters; cannot be cleared.' })
  @ValidateIf((dto: UpdateProfileDto) => dto.displayName !== undefined)
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true, type: String })
  @IsOptional()
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'avatarUrl must be an https URL' },
  )
  @MaxLength(2048)
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: 28, nullable: true, type: Number })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number | null;

  @ApiPropertyOptional({ example: 'Paris', nullable: true, type: String })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  city?: string | null;

  @ApiPropertyOptional({
    example: 'Toujours partante pour une expo.',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  /** Only the fields that were sent (a declared but absent field is `undefined`, not a change). */
  toChange(): UserProfileChange {
    const change: UserProfileChange = {};
    if (this.displayName !== undefined) change.displayName = this.displayName;
    if (this.avatarUrl !== undefined) change.avatarUrl = this.avatarUrl;
    if (this.age !== undefined) change.age = this.age;
    if (this.city !== undefined) change.city = this.city;
    if (this.bio !== undefined) change.bio = this.bio;
    return change;
  }
}

// ─── Preferences ───────────────────────────────────────────────────────────────────────────────────

/** mobile `BudgetRange` ↔ database `BudgetRange` (MVP_SCOPE.md §3). */
const BUDGET = {
  free: 'FREE',
  under10: 'UNDER_10',
  '10to25': 'FROM_10_TO_25',
  '25to50': 'FROM_25_TO_50',
  '50plus': 'OVER_50',
} as const satisfies Record<string, BudgetRange>;

/** mobile `Company` ↔ database `Company` (MVP_SCOPE.md §2). */
const COMPANY = {
  alone: 'ALONE',
  couple: 'COUPLE',
  friends: 'FRIENDS',
  family: 'FAMILY',
} as const satisfies Record<string, Company>;

export type BudgetRangeValue = keyof typeof BUDGET;
export type CompanyValue = keyof typeof COMPANY;
export const BUDGET_VALUES = Object.keys(BUDGET) as BudgetRangeValue[];
export const COMPANY_VALUES = Object.keys(COMPANY) as CompanyValue[];

const reverse = <K extends string, V extends string>(map: Record<K, V>) =>
  Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key])) as Record<V, K>;
const BUDGET_VALUE = reverse(BUDGET);
const COMPANY_VALUE = reverse(COMPANY);

const TAGS = (field: string) => [
  IsArray(),
  ArrayMaxSize(20),
  IsString({ each: true }),
  Length(1, 50, { each: true, message: `each value of ${field} must be 1–50 characters` }),
  Transform(trimAll),
];

function apply(...decorators: PropertyDecorator[]): PropertyDecorator {
  return (target, key) => decorators.forEach((decorator) => decorator(target, key));
}

/**
 * The lasting preferences collected by the MVP onboarding (MVP_SCOPE.md §2) — a partial update: absent fields
 * are unchanged, `null` clears a single value, `[]` clears a list. The first save creates them.
 */
export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    example: ['culture', 'food'],
    type: [String],
    description: 'Up to 20 values.',
  })
  @ValidateIf((dto: UpdatePreferencesDto) => dto.interests !== undefined)
  @apply(...TAGS('interests'))
  interests?: string[];

  @ApiPropertyOptional({
    example: ['museums', 'walks'],
    type: [String],
    description: 'Up to 20 values.',
  })
  @ValidateIf((dto: UpdatePreferencesDto) => dto.activities !== undefined)
  @apply(...TAGS('activities'))
  activities?: string[];

  @ApiPropertyOptional({ enum: BUDGET_VALUES, nullable: true, example: '10to25' })
  @IsOptional()
  @IsIn(BUDGET_VALUES)
  usualBudget?: BudgetRangeValue | null;

  @ApiPropertyOptional({ example: 5, nullable: true, type: Number, description: '1–50 km.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxDistanceKm?: number | null;

  @ApiPropertyOptional({ enum: COMPANY_VALUES, nullable: true, example: 'friends' })
  @IsOptional()
  @IsIn(COMPANY_VALUES)
  usualCompany?: CompanyValue | null;

  /** The change for the repository, in database vocabulary; only the fields that were sent. */
  toChange(): UserPreferenceChange {
    const change: UserPreferenceChange = {};
    if (this.interests !== undefined) change.interests = this.interests;
    if (this.activities !== undefined) change.activities = this.activities;
    if (this.usualBudget !== undefined) {
      change.usualBudget = this.usualBudget === null ? null : BUDGET[this.usualBudget];
    }
    if (this.maxDistanceKm !== undefined) change.maxDistanceKm = this.maxDistanceKm;
    if (this.usualCompany !== undefined) {
      change.usualCompany = this.usualCompany === null ? null : COMPANY[this.usualCompany];
    }
    return change;
  }
}

export class PreferencesResponse {
  @ApiProperty({ example: ['culture', 'food'], type: [String] }) interests!: string[];
  @ApiProperty({ example: ['museums'], type: [String] }) activities!: string[];
  @ApiProperty({ enum: BUDGET_VALUES, nullable: true, example: '10to25' })
  usualBudget!: BudgetRangeValue | null;
  @ApiProperty({ example: 5, nullable: true, type: Number }) maxDistanceKm!: number | null;
  @ApiProperty({ enum: COMPANY_VALUES, nullable: true, example: 'friends' })
  usualCompany!: CompanyValue | null;
  @ApiProperty({
    example: '2026-09-26T12:00:00.000Z',
    nullable: true,
    type: String,
    description: 'null: never saved (the values are then the empty defaults).',
  })
  updatedAt!: string | null;

  static from(preference: UserPreference | null): PreferencesResponse {
    if (!preference) {
      return {
        interests: [],
        activities: [],
        usualBudget: null,
        maxDistanceKm: null,
        usualCompany: null,
        updatedAt: null,
      };
    }
    return {
      interests: preference.interests,
      activities: preference.activities,
      usualBudget: preference.usualBudget && BUDGET_VALUE[preference.usualBudget],
      maxDistanceKm: preference.maxDistanceKm,
      usualCompany: preference.usualCompany && COMPANY_VALUE[preference.usualCompany],
      updatedAt: preference.updatedAt.toISOString(),
    };
  }
}

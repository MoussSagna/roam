import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { ExperienceResponse } from '../../experiences/dto/experience.dto.js';
import type { FavoriteDetail } from '../favorites.service.js';

/**
 * Bodies of `/api/v1/favorites` (FAVORITES_API.md). The owner is the session user; the id and the date come from the
 * server: any other field is refused (400). Examples are fictional.
 */

const toInt = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number(value);

export class AddFavoriteDto {
  @ApiProperty({
    example: '01a0db2f-0000-7000-8000-00000000000a',
    description: 'A catalog experience.',
  })
  @IsUUID()
  experienceId!: string;
}

export class ListFavoritesQuery {
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

/** A favorite: when it was saved and the canonical experience (API-07 list shape). Never the owner id. */
export class FavoriteResponse {
  @ApiProperty({ example: '01a0db2f-0000-7000-8000-0000000000c1' }) id!: string;
  @ApiProperty({ example: '01a0db2f-0000-7000-8000-00000000000a' }) experienceId!: string;
  @ApiProperty({ format: 'date-time', description: 'When it was saved.' }) createdAt!: string;
  @ApiProperty({ type: ExperienceResponse }) experience!: ExperienceResponse;

  static from(favorite: FavoriteDetail): FavoriteResponse {
    return {
      id: favorite.id,
      experienceId: favorite.experienceId,
      createdAt: favorite.createdAt.toISOString(),
      experience: ExperienceResponse.from(favorite.experience),
    };
  }
}

export class FavoritePageResponse {
  @ApiProperty({ type: [FavoriteResponse] }) items!: FavoriteResponse[];
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Pass as `cursor`; null on the last page.',
  })
  nextCursor!: string | null;
}

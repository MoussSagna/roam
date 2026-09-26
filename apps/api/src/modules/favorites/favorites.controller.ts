import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
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
  AddFavoriteDto,
  FavoritePageResponse,
  FavoriteResponse,
  ListFavoritesQuery,
} from './dto/favorite.dto.js';
import { FavoritesService } from './favorites.service.js';

const error = (code: string) => ({ schema: { example: { error: { code, message: '…' } } } });

/**
 * `/api/v1/favorites` — my favorite experiences (FAVORITES_API.md). Global AuthGuard; the owner is always the session
 * user: no route, query or body takes a user id.
 */
@ApiTags('favorites')
@ApiBearerAuth()
@ApiUnauthorizedResponse(error('AUTH_UNAUTHORIZED | AUTH_SESSION_INVALID'))
@ApiServiceUnavailableResponse(error('DATABASE_UNAVAILABLE'))
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({
    summary: 'My favorite experiences',
    description:
      'Most recently saved first, with each experience (inactive ones included, `isActive: false`). ' +
      'Pagination: `limit` + `cursor` → `{ items, nextCursor }`.',
  })
  @ApiOkResponse({ type: FavoritePageResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('VALIDATION_ERROR | BAD_REQUEST'))
  async list(
    @CurrentUser() me: User,
    @Query() query: ListFavoritesQuery,
  ): Promise<FavoritePageResponse> {
    const page = await this.favorites.list(me, { limit: query.limit, cursor: query.cursor });
    return {
      items: page.items.map((item) => FavoriteResponse.from(item)),
      nextCursor: page.nextCursor,
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Save an experience to my favorites',
    description:
      'Idempotent: saving it again answers the same favorite (same id), never a duplicate.',
  })
  @ApiCreatedResponse({ type: FavoriteResponse, description: 'In `{ data }`.' })
  @ApiBadRequestResponse(error('VALIDATION_ERROR'))
  @ApiNotFoundResponse(error('NOT_FOUND'))
  @ApiUnprocessableEntityResponse(error('FAVORITE_EXPERIENCE_INACTIVE'))
  async add(@CurrentUser() me: User, @Body() body: AddFavoriteDto): Promise<FavoriteResponse> {
    return FavoriteResponse.from(await this.favorites.add(me, body.experienceId));
  }

  @Delete(':experienceId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove an experience from my favorites',
    description: 'Idempotent: 204 whether or not it was a favorite.',
  })
  @ApiNoContentResponse({ description: 'No body.' })
  @ApiBadRequestResponse(error('BAD_REQUEST'))
  async remove(
    @CurrentUser() me: User,
    @Param('experienceId', new ParseUUIDPipe()) experienceId: string,
  ): Promise<void> {
    await this.favorites.remove(me, experienceId);
  }
}

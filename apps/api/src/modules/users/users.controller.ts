import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth.guard.js';
import {
  PreferencesResponse,
  UpdatePreferencesDto,
  UpdateProfileDto,
  UserResponse,
} from './dto/user.dto.js';
import type { User } from './user.repository.js';
import { UsersService } from './users.service.js';

const error = (code: string) => ({ schema: { example: { error: { code, message: '…' } } } });

/**
 * `/api/v1/users/me` — the signed-in user's own profile and preferences. Protected by the global AuthGuard;
 * the user always comes from the session (`@CurrentUser()`): there is no route taking a user id. Reading the
 * profile is `GET /api/v1/auth/me`.
 */
@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse(error('AUTH_UNAUTHORIZED | AUTH_SESSION_INVALID'))
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch()
  @ApiOperation({
    summary: 'Update my profile (partial)',
    description:
      'Only the fields sent change; `null` clears an optional field. The email cannot be changed.',
  })
  @ApiOkResponse({ type: UserResponse, description: 'The updated profile, in `{ data }`.' })
  @ApiBadRequestResponse(error('VALIDATION_ERROR'))
  async updateProfile(
    @CurrentUser() me: User,
    @Body() body: UpdateProfileDto,
  ): Promise<UserResponse> {
    return UserResponse.from(await this.users.updateProfile(me, body.toChange()));
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'My preferences',
    description: 'Empty defaults (`updatedAt: null`) when never saved.',
  })
  @ApiOkResponse({ type: PreferencesResponse, description: 'In `{ data }`.' })
  async getPreferences(@CurrentUser() me: User): Promise<PreferencesResponse> {
    return PreferencesResponse.from(await this.users.getPreferences(me));
  }

  @Patch('preferences')
  @ApiOperation({
    summary: 'Save my preferences (partial; created on first save)',
    description: 'Only the fields sent change; `null` clears a value, `[]` clears a list.',
  })
  @ApiOkResponse({
    type: PreferencesResponse,
    description: 'The saved preferences, in `{ data }`.',
  })
  @ApiBadRequestResponse(error('VALIDATION_ERROR'))
  async savePreferences(
    @CurrentUser() me: User,
    @Body() body: UpdatePreferencesDto,
  ): Promise<PreferencesResponse> {
    return PreferencesResponse.from(await this.users.savePreferences(me, body.toChange()));
  }
}

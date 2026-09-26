import { Module } from '@nestjs/common';

import { UserRepository } from './user.repository.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

/**
 * Users: the repository (accounts, profile, preferences — shared with authentication) and the signed-in user's
 * profile and preferences endpoints (API-06, USER_PROFILE_AND_PREFERENCES.md).
 */
@Module({
  controllers: [UsersController],
  providers: [UserRepository, UsersService],
  exports: [UserRepository, UsersService],
})
export class UsersModule {}

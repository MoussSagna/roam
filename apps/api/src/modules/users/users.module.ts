import { Module } from '@nestjs/common';

import { UserRepository } from './user.repository.js';

/** Users and their preferences. Persistence only for now (API-04); authentication is its own step. */
@Module({
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UsersModule {}

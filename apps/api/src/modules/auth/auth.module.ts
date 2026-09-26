import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { Clock } from '../../common/clock.js';
import { UsersModule } from '../users/users.module.js';
import { AuthSessionRepository } from './auth-session.repository.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { PasswordHasher } from './password-hasher.js';
import {
  PasswordResetDelivery,
  UnconfiguredPasswordResetDelivery,
} from './password-reset-delivery.js';
import { PasswordResetRepository } from './password-reset.repository.js';

/**
 * Authentication (AUTHENTICATION.md): accounts, sessions, password reset, and the global guard that protects
 * every route not marked `@Public()`.
 */
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionRepository,
    PasswordResetRepository,
    PasswordHasher,
    Clock,
    { provide: PasswordResetDelivery, useClass: UnconfiguredPasswordResetDelivery },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}

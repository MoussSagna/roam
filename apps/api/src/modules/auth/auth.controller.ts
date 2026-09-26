import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import type { User } from '../users/user.repository.js';
import { CurrentUser, Public } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SignedInResponse,
  UserResponse,
  VerifyResetCodeDto,
} from './dto/auth.dto.js';
import { bearerToken } from './session-token.js';

const error = (code: string) => ({ schema: { example: { error: { code, message: '…' } } } });

/**
 * `/api/v1/auth` — the account endpoints the mobile auth flow needs (AUTHENTICATION.md → "Mobile contract").
 * HTTP only: the rules are in `AuthService`.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create an account and sign in' })
  @ApiCreatedResponse({ type: SignedInResponse, description: 'In `{ data }`.' })
  @ApiConflictResponse(error('AUTH_EMAIL_ALREADY_EXISTS'))
  @ApiBadRequestResponse(error('VALIDATION_ERROR'))
  async register(@Body() body: RegisterDto): Promise<SignedInResponse> {
    return SignedInResponse.from(await this.auth.register(body));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: SignedInResponse, description: 'In `{ data }`.' })
  @ApiUnauthorizedResponse(error('AUTH_INVALID_CREDENTIALS'))
  @ApiBadRequestResponse(error('VALIDATION_ERROR'))
  async login(@Body() body: LoginDto): Promise<SignedInResponse> {
    return SignedInResponse.from(await this.auth.login(body));
  }

  /** Public on purpose: an expired or unknown token still "logs out" (idempotent), the app clears its copy. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current session (idempotent)' })
  @ApiNoContentResponse()
  async logout(@Headers('authorization') authorization?: string): Promise<void> {
    const token = bearerToken(authorization);
    if (token) await this.auth.logout(token);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The signed-in user' })
  @ApiOkResponse({ type: UserResponse, description: 'In `{ data }`.' })
  @ApiUnauthorizedResponse(error('AUTH_UNAUTHORIZED | AUTH_SESSION_INVALID'))
  me(@CurrentUser() user: User): UserResponse {
    return UserResponse.from(user);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request a reset code',
    description: 'Same answer whether the email has an account or not. The code is never returned.',
  })
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<void> {
    await this.auth.requestPasswordReset(body.email);
  }

  @Public()
  @Post('password/verify-code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Check a reset code (counts as an attempt)' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse(error('AUTH_RESET_CODE_INVALID'))
  async verifyResetCode(@Body() body: VerifyResetCodeDto): Promise<void> {
    await this.auth.verifyResetCode(body.email, body.code);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a new password with a reset code; signs out every device' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse(error('AUTH_RESET_CODE_INVALID'))
  async resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(body);
  }
}

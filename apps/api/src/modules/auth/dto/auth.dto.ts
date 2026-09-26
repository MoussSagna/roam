import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UserResponse } from '../../users/dto/user.dto.js';
import type { SignedIn } from '../auth.service.js';

export { UserResponse };

/**
 * Request and response bodies of `/api/v1/auth/*`. Examples are fictional. Passwords are never trimmed or
 * transformed, and — like every rejected value — never echoed back in a validation error.
 */

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** The mobile Register rules: at least 8 characters, a letter and a digit (max 128: bounded hashing work). */
const PASSWORD_RULES = [
  IsString(),
  MinLength(8),
  MaxLength(128),
  Matches(/[A-Za-z]/, { message: 'password must contain a letter' }),
  Matches(/[0-9]/, { message: 'password must contain a digit' }),
];

const EmailField = () => [
  Transform(trim),
  IsEmail({}, { message: 'email must be a valid email address' }),
  MaxLength(254),
];

function apply(...decorators: PropertyDecorator[]): PropertyDecorator {
  return (target, key) => decorators.forEach((decorator) => decorator(target, key));
}

export class RegisterDto {
  @ApiProperty({ example: 'Léa', description: 'First name shown in the app (1–50 characters).' })
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  displayName!: string;

  @ApiProperty({ example: 'lea@example.com' })
  @apply(...EmailField())
  email!: string;

  @ApiProperty({
    example: 'example-Passw0rd',
    description: '8–128 characters, a letter and a digit.',
  })
  @apply(...PASSWORD_RULES)
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'lea@example.com' })
  @apply(...EmailField())
  email!: string;

  @ApiProperty({ example: 'example-Passw0rd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'lea@example.com' })
  @apply(...EmailField())
  email!: string;
}

export class VerifyResetCodeDto extends ForgotPasswordDto {
  @ApiProperty({ example: '000000', description: 'The 6-digit code received by the user.' })
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}

export class ResetPasswordDto extends VerifyResetCodeDto {
  @ApiProperty({
    example: 'new-example-Passw0rd',
    description: '8–128 characters, a letter and a digit.',
  })
  @apply(...PASSWORD_RULES)
  newPassword!: string;
}

export class SessionResponse {
  @ApiProperty({
    example: 'q8Jx0K3v…',
    description: 'Bearer token for `Authorization: Bearer <token>`. Shown once; store it securely.',
  })
  token!: string;

  @ApiProperty({ example: '2026-10-26T12:00:00.000Z' })
  expiresAt!: string;
}

export class SignedInResponse {
  @ApiProperty({ type: UserResponse }) user!: UserResponse;
  @ApiProperty({ type: SessionResponse }) session!: SessionResponse;

  static from({ user, session }: SignedIn): SignedInResponse {
    return {
      user: UserResponse.from(user),
      session: { token: session.token, expiresAt: session.expiresAt.toISOString() },
    };
  }
}

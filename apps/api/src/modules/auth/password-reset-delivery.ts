import { Injectable, Logger } from '@nestjs/common';

/**
 * Sends a password reset code to its owner. The channel (an email provider) is not chosen yet
 * (AUTHENTICATION.md → "Deferred"): the application registers `UnconfiguredPasswordResetDelivery`, tests
 * provide their own. An email provider will be a new implementation of this class, nothing else changes.
 */
export abstract class PasswordResetDelivery {
  abstract send(email: string, code: string): Promise<void>;
}

/**
 * No channel configured: the code is **not** sent, and neither logged nor returned (it would be a credential
 * in the logs). One warning without the email or the code, so the gap is visible.
 */
@Injectable()
export class UnconfiguredPasswordResetDelivery extends PasswordResetDelivery {
  private readonly logger = new Logger('PasswordReset');

  send(): Promise<void> {
    this.logger.warn(
      'Password reset requested, but no delivery channel is configured: code not sent',
    );
    return Promise.resolve();
  }
}

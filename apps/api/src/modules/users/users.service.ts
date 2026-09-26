import { Injectable } from '@nestjs/common';

import {
  ForeignKeyConstraintError,
  RecordNotFoundError,
} from '../../database/persistence-errors.js';
import { authErrors } from '../auth/auth.errors.js';
import {
  type User,
  type UserPreference,
  type UserPreferenceChange,
  type UserProfileChange,
  UserRepository,
} from './user.repository.js';

/**
 * The signed-in user's own account: profile and lasting preferences (USER_PROFILE_AND_PREFERENCES.md). Every
 * method takes the **authenticated** user (from the session, `@CurrentUser()`), never an id sent by the client:
 * a user can only ever read or change their own data.
 */
@Injectable()
export class UsersService {
  constructor(private readonly users: UserRepository) {}

  /**
   * Partial update of the editable fields (not the email). One query; none when nothing changes. (Reading the
   * profile needs no service call: it is the user the session loaded — `GET /auth/me`.)
   */
  async updateProfile(me: User, change: UserProfileChange): Promise<User> {
    if (Object.keys(change).length === 0) return me;
    try {
      return await this.users.updateProfile(me.id, change);
    } catch (error) {
      throw this.accountGone(error);
    }
  }

  /** `null` when the user never saved preferences (the API answers the empty defaults). */
  getPreferences(me: User): Promise<UserPreference | null> {
    return this.users.findPreference(me.id);
  }

  /** Creates the preferences on the first save, then updates only the given fields. One query (upsert). */
  async savePreferences(me: User, change: UserPreferenceChange): Promise<UserPreference> {
    try {
      return await this.users.savePreference(me.id, change);
    } catch (error) {
      throw this.accountGone(error);
    }
  }

  /**
   * The account was deleted after the session was checked (a race: deleting a user deletes its sessions): the
   * session is no longer valid — the same answer as any request made after the deletion.
   */
  private accountGone(error: unknown): unknown {
    const gone = error instanceof RecordNotFoundError || error instanceof ForeignKeyConstraintError;
    return gone ? authErrors.sessionInvalid() : error;
  }
}

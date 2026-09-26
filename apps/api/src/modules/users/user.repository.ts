import { Injectable } from '@nestjs/common';

import { persist } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import type {
  User as UserRow,
  UserPreference as UserPreferenceRow,
} from '../../generated/prisma/client.js';
import type { BudgetRange, Company } from '../../generated/prisma/enums.js';

/** A ROAM user (mobile `User`). Never carries credentials: the password hash has its own method. */
export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  age: number | null;
  city: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewUser = Pick<User, 'email' | 'displayName'> &
  Partial<Pick<User, 'avatarUrl' | 'age' | 'city' | 'bio'>>;

/** The editable profile fields; `undefined` leaves a field unchanged, `null` clears it. */
export type UserProfileChange = Partial<
  Pick<User, 'displayName' | 'avatarUrl' | 'age' | 'city' | 'bio'>
>;

/** Lasting preferences (MVP_SCOPE.md §2), every field optional. */
export type UserPreference = {
  interests: string[];
  activities: string[];
  usualBudget: BudgetRange | null;
  maxDistanceKm: number | null;
  usualCompany: Company | null;
  updatedAt: Date;
};

export type UserPreferenceChange = Partial<Omit<UserPreference, 'updatedAt'>>;

/** What sign-in needs, read in one query: the user and its password hash (null: no password set). */
export type UserCredentials = { user: User; passwordHash: string | null };

export const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  displayName: row.displayName,
  avatarUrl: row.avatarUrl,
  age: row.age,
  city: row.city,
  bio: row.bio,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toUserPreference = (row: UserPreferenceRow): UserPreference => ({
  interests: row.interests,
  activities: row.activities,
  usualBudget: row.usualBudget,
  maxDistanceKm: row.maxDistanceKm,
  usualCompany: row.usualCompany,
  updatedAt: row.updatedAt,
});

/**
 * Users and their preferences (one aggregate: the preferences belong to the user). Ready for the
 * authentication step (lookup by email) without storing any credential.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return persist(async () => {
      const row = await this.prisma.user.findUnique({ where: { id } });
      return row && toUser(row);
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return persist(async () => {
      const row = await this.prisma.user.findUnique({ where: { email } });
      return row && toUser(row);
    });
  }

  /**
   * Throws `UniqueConstraintError` when the email is taken. `passwordHash` is an Argon2id hash computed by the
   * authentication service — never a password.
   */
  create(user: NewUser, credentials: { passwordHash?: string } = {}): Promise<User> {
    return persist(async () =>
      toUser(
        await this.prisma.user.create({
          data: { ...user, passwordHash: credentials.passwordHash ?? null },
        }),
      ),
    );
  }

  /** For sign-in only: the user and its password hash. `null` when no user has this email. */
  findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    return persist(async () => {
      const row = await this.prisma.user.findUnique({ where: { email } });
      return row && { user: toUser(row), passwordHash: row.passwordHash };
    });
  }

  /** Throws `RecordNotFoundError` when the user does not exist. */
  updateProfile(id: string, change: UserProfileChange): Promise<User> {
    return persist(async () =>
      toUser(await this.prisma.user.update({ where: { id }, data: change })),
    );
  }

  findPreference(userId: string): Promise<UserPreference | null> {
    return persist(async () => {
      const row = await this.prisma.userPreference.findUnique({ where: { userId } });
      return row && toUserPreference(row);
    });
  }

  /** Creates or updates the user's preferences (only the given fields). Unknown user: foreign key error. */
  savePreference(userId: string, change: UserPreferenceChange): Promise<UserPreference> {
    return persist(async () =>
      toUserPreference(
        await this.prisma.userPreference.upsert({
          where: { userId },
          create: { userId, ...change },
          update: change,
        }),
      ),
    );
  }
}

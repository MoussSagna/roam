import { ApiException } from '../../common/errors/api-error.js';
import {
  DatabaseUnavailableError,
  ForeignKeyConstraintError,
  RecordNotFoundError,
} from '../../database/persistence-errors.js';
import type { User, UserPreference, UserRepository } from './user.repository.js';
import { UsersService } from './users.service.js';

const me: User = {
  id: 'user-a',
  email: 'lea@example.com',
  displayName: 'Léa',
  avatarUrl: null,
  age: null,
  city: null,
  bio: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const preference: UserPreference = {
  interests: ['culture'],
  activities: [],
  usualBudget: 'FROM_10_TO_25',
  maxDistanceKm: 5,
  usualCompany: null,
  updatedAt: new Date(0),
};

/** UserRepository mocked: no database in unit tests. */
function setup() {
  const users = { updateProfile: vi.fn(), findPreference: vi.fn(), savePreference: vi.fn() };
  return { users, service: new UsersService(users as unknown as UserRepository) };
}

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'resolved',
    (error: unknown) => (error instanceof ApiException ? error.code : error),
  );

describe('UsersService', () => {
  describe('profile', () => {
    it('updates the authenticated user only, with the given fields', async () => {
      const { service, users } = setup();
      users.updateProfile.mockResolvedValue({ ...me, city: 'Paris' });

      const updated = await service.updateProfile(me, { city: 'Paris', bio: null });

      expect(users.updateProfile).toHaveBeenCalledWith('user-a', { city: 'Paris', bio: null });
      expect(updated.city).toBe('Paris');
    });

    it('nothing to change: no query, the current profile', async () => {
      const { service, users } = setup();
      expect(await service.updateProfile(me, {})).toBe(me);
      expect(users.updateProfile).not.toHaveBeenCalled();
    });

    it('the account was deleted meanwhile → AUTH_SESSION_INVALID (not a raw persistence error)', async () => {
      const { service, users } = setup();
      users.updateProfile.mockRejectedValue(new RecordNotFoundError('User'));
      expect(await codeOf(service.updateProfile(me, { city: 'Lyon' }))).toBe(
        'AUTH_SESSION_INVALID',
      );
    });

    it('other errors pass through (database unavailable → 503 by the global filter)', async () => {
      const { service, users } = setup();
      const outage = new DatabaseUnavailableError();
      users.updateProfile.mockRejectedValue(outage);
      expect(await codeOf(service.updateProfile(me, { city: 'Lyon' }))).toBe(outage);
    });
  });

  describe('preferences', () => {
    it('reads the authenticated user’s preferences; null when never saved', async () => {
      const { service, users } = setup();
      users.findPreference.mockResolvedValueOnce(preference).mockResolvedValueOnce(null);

      expect(await service.getPreferences(me)).toBe(preference);
      expect(await service.getPreferences(me)).toBeNull();
      expect(users.findPreference).toHaveBeenCalledWith('user-a');
    });

    it('saves (create or update: the repository upserts) for the authenticated user only', async () => {
      const { service, users } = setup();
      users.savePreference.mockResolvedValue(preference);

      await service.savePreferences(me, { maxDistanceKm: 5 });

      expect(users.savePreference).toHaveBeenCalledWith('user-a', { maxDistanceKm: 5 });
    });

    it('the account was deleted meanwhile (foreign key) → AUTH_SESSION_INVALID', async () => {
      const { service, users } = setup();
      users.savePreference.mockRejectedValue(
        new ForeignKeyConstraintError('missingReference', 'user_preferences_userId_fkey'),
      );
      expect(await codeOf(service.savePreferences(me, { interests: [] }))).toBe(
        'AUTH_SESSION_INVALID',
      );
    });
  });
});

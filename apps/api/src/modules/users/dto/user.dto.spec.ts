import { plainToInstance } from 'class-transformer';

import {
  PreferencesResponse,
  UpdatePreferencesDto,
  UpdateProfileDto,
  UserResponse,
} from './user.dto.js';

describe('users DTOs', () => {
  it('profile change: only the fields sent, null kept (clears), undefined dropped', () => {
    const dto = plainToInstance(UpdateProfileDto, { city: 'Paris', bio: null });
    expect(dto.toChange()).toEqual({ city: 'Paris', bio: null });
    expect(plainToInstance(UpdateProfileDto, {}).toChange()).toEqual({});
  });

  it('preferences change: mobile values → database enums, only the fields sent', () => {
    const dto = plainToInstance(UpdatePreferencesDto, {
      usualBudget: '10to25',
      usualCompany: 'friends',
      interests: [' culture '],
    });
    expect(dto.toChange()).toEqual({
      usualBudget: 'FROM_10_TO_25',
      usualCompany: 'FRIENDS',
      interests: ['culture'],
    });
    expect(
      plainToInstance(UpdatePreferencesDto, { usualBudget: null, usualCompany: null }).toChange(),
    ).toEqual({ usualBudget: null, usualCompany: null });
  });

  it('every budget and company value maps both ways', () => {
    for (const usualBudget of ['free', 'under10', '10to25', '25to50', '50plus'] as const) {
      for (const usualCompany of ['alone', 'couple', 'friends', 'family'] as const) {
        const change = plainToInstance(UpdatePreferencesDto, {
          usualBudget,
          usualCompany,
        }).toChange();
        const response = PreferencesResponse.from({
          interests: [],
          activities: [],
          maxDistanceKm: null,
          updatedAt: new Date(0),
          usualBudget: change.usualBudget ?? null,
          usualCompany: change.usualCompany ?? null,
        });
        expect([response.usualBudget, response.usualCompany]).toEqual([usualBudget, usualCompany]);
      }
    }
  });

  it('never-saved preferences answer the empty defaults', () => {
    expect(PreferencesResponse.from(null)).toEqual({
      interests: [],
      activities: [],
      usualBudget: null,
      maxDistanceKm: null,
      usualCompany: null,
      updatedAt: null,
    });
  });

  it('the public user keeps only the mobile User fields', () => {
    const user = {
      id: 'u1',
      email: 'lea@example.com',
      displayName: 'Léa',
      avatarUrl: null,
      age: 28,
      city: null,
      bio: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      passwordHash: '$argon2id$fictional',
    };
    expect(Object.keys(UserResponse.from(user)).sort()).toEqual(
      ['age', 'avatarUrl', 'bio', 'city', 'displayName', 'email', 'id'].sort(),
    );
  });
});

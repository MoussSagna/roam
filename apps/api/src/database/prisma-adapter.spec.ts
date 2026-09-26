import { PrismaPg } from '@prisma/adapter-pg';

import { createPrismaAdapter, UTC_SESSION_OPTIONS } from './prisma-adapter.js';

vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: vi.fn() }));

describe('createPrismaAdapter (no database needed)', () => {
  it('opens every connection with a UTC session time zone', () => {
    createPrismaAdapter('postgresql://roam:roam@127.0.0.1:1/roam_test');

    expect(UTC_SESSION_OPTIONS).toBe('-c TimeZone=UTC');
    expect(PrismaPg).toHaveBeenCalledWith({
      connectionString: 'postgresql://roam:roam@127.0.0.1:1/roam_test',
      options: UTC_SESSION_OPTIONS,
    });
  });
});

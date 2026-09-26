import { getWhyRecommended } from '@/features/experiences/lib/whyRecommended';
import { pickHeroExperiences, pickPopularExperiences } from '@/features/home/lib/pickFeatured';
import { pickForYou } from '@/features/home/lib/pickForYou';
import { sortResults } from '@/features/search/lib/sortResults';
import i18n from '@/i18n';
import { categories } from '@/services/mock/data';

import fixture from '../__fixtures__/catalog-api-responses.json';
import type { ExperienceDto, PageDto } from '../dto';

import { mapExperienceDto } from './experience';

const t = (key: string, options?: Record<string, unknown>) =>
  i18n.t(key as never, options as never) as unknown as string;

const page = fixture.list.data as PageDto<ExperienceDto>;
const detail = fixture.detail.data as ExperienceDto;

/**
 * Integration of the mapping with **real API answers** (captured from the local API on `roam_test`, DATA-1
 * catalog): what the screens receive in API mode, run through the same presentation helpers they use.
 */
describe('real catalog answers → the model the screens read', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('fr');
  });

  const experiences = page.items.map((dto) => mapExperienceDto(dto, { categories, t }));

  it('maps the whole catalog page', () => {
    expect(page.nextCursor).toBeNull();
    expect(experiences).toHaveLength(14);
    for (const experience of experiences) {
      expect(experience.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(
        experience.categoryIds.every((id) => categories.some((category) => category.id === id)),
      ).toBe(true);
      expect(experience.estimatedDurationMin).toEqual(expect.any(Number));
      expect(experience.estimatedBudget).toBeDefined();
      expect(experience.durationLabel).toMatch(/^\d+ h( \d{2})?$|^\d+ min$/);
      expect(experience.priceLabel).not.toContain('undefined');
      expect(experience.coordinates).toEqual({
        latitude: expect.any(Number),
        longitude: expect.any(Number),
      });
      // API experience images are absent today (DATA-1): no image, no fabricated one.
      expect(experience.coverImage).toBeUndefined();
      expect(experience.images).toBeUndefined();
    }
  });

  it('gives each migrated experience back its original mock budget bracket', () => {
    const brackets = experiences.map((experience) => experience.estimatedBudget).sort();
    // DATA-1 report §15: 4 free, 3 under10, 4 10to25, 3 25to50.
    expect(brackets.filter((bracket) => bracket === 'free')).toHaveLength(4);
    expect(brackets.filter((bracket) => bracket === 'under10')).toHaveLength(3);
    expect(brackets.filter((bracket) => bracket === '10to25')).toHaveLength(4);
    expect(brackets.filter((bracket) => bracket === '25to50')).toHaveLength(3);
  });

  it('maps a detail with its places', () => {
    const experience = mapExperienceDto(detail, { categories, t });
    expect(experience.placeIds).toHaveLength(2);
    expect(experience.title).toBe(detail.title);
  });

  it('feeds the screens’ own presentation helpers without errors', () => {
    expect(pickHeroExperiences(experiences)).toHaveLength(5);
    expect(pickPopularExperiences(experiences).length).toBeGreaterThan(0);
    expect(pickForYou(experiences, 'calm')).toHaveLength(4);
    expect(sortResults(experiences, 'priceAsc')[0].estimatedBudget).toBe('free');
    expect(() => experiences.map(getWhyRecommended)).not.toThrow();
  });
});

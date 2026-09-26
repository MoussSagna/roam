import {
  hasSingleEnrichmentTarget,
  hasSingleSourceTarget,
  isHourMinute,
  isValidJourneyRating,
} from './domain-constraints.js';

describe('data model rules enforced by the services', () => {
  it('journey feedback rating: an integer from 1 to 5', () => {
    expect([1, 3, 5].every(isValidJourneyRating)).toBe(true);
    expect([0, 6, 2.5, Number.NaN].some(isValidJourneyRating)).toBe(false);
  });

  it('journey times: "HH:MM" on a 24-hour clock', () => {
    expect(['00:00', '09:45', '23:59'].every(isHourMinute)).toBe(true);
    expect(['9:45', '24:00', '12:60', '12h30', ''].some(isHourMinute)).toBe(false);
  });

  it('an external source points at exactly the record its entity type names', () => {
    expect(hasSingleSourceTarget({ entityType: 'PLACE', placeId: 'p1' })).toBe(true);
    expect(hasSingleSourceTarget({ entityType: 'EVENT', eventId: 'e1', placeId: null })).toBe(true);
    // Wrong column for the type, none, or two.
    expect(hasSingleSourceTarget({ entityType: 'EVENT', placeId: 'p1' })).toBe(false);
    expect(hasSingleSourceTarget({ entityType: 'PLACE' })).toBe(false);
    expect(hasSingleSourceTarget({ entityType: 'PLACE', placeId: 'p1', eventId: 'e1' })).toBe(
      false,
    );
  });

  it('an enrichment describes one place or one experience, never both or neither', () => {
    expect(hasSingleEnrichmentTarget({ placeId: 'p1' })).toBe(true);
    expect(hasSingleEnrichmentTarget({ experienceId: 'x1', placeId: null })).toBe(true);
    expect(hasSingleEnrichmentTarget({ placeId: 'p1', experienceId: 'x1' })).toBe(false);
    expect(hasSingleEnrichmentTarget({})).toBe(false);
  });
});

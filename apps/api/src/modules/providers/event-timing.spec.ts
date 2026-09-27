import { instantToLocal, localToInstant, resolveEventTiming } from './event-timing.js';

const none = { startDate: null, endDate: null, timezone: null };

describe('event timing (never an invented time)', () => {
  it('Europe/Paris summer (UTC+2) and winter (UTC+1): local ↔ instant', () => {
    expect(localToInstant('2026-07-14', '22:30', 'Europe/Paris')?.toISOString()).toBe(
      '2026-07-14T20:30:00.000Z',
    );
    expect(localToInstant('2026-12-12', '22:30', 'Europe/Paris')?.toISOString()).toBe(
      '2026-12-12T21:30:00.000Z',
    );
    expect(instantToLocal(new Date('2026-07-14T20:30:00Z'), 'Europe/Paris')).toEqual({
      date: '2026-07-14',
      time: '22:30',
    });
    expect(instantToLocal(new Date('2026-12-31T23:30:00Z'), 'Europe/Paris')).toEqual({
      date: '2027-01-01',
      time: '00:30',
    });
  });

  it('a wall-clock time that does not exist (spring forward) has no instant; the fall-back hour takes its first occurrence', () => {
    expect(localToInstant('2026-03-29', '02:30', 'Europe/Paris')).toBeNull();
    expect(localToInstant('2026-10-25', '02:30', 'Europe/Paris')?.toISOString()).toBe(
      '2026-10-25T00:30:00.000Z',
    );
  });

  it('UTC instant (Ticketmaster): kept exact, local date and time derived in its zone', () => {
    expect(
      resolveEventTiming({
        startDate: new Date('2026-10-03T20:30:00Z'),
        endDate: null,
        timezone: 'Europe/Paris',
      }),
    ).toEqual({
      startDate: new Date('2026-10-03T20:30:00Z'),
      endDate: null,
      timezone: 'Europe/Paris',
      localStartDate: '2026-10-03',
      localStartTime: '22:30',
      localEndDate: null,
      localEndTime: null,
    });
  });

  it('date only: no instant, no time — never 00:00 or 12:00', () => {
    const timing = resolveEventTiming({
      ...none,
      timezone: 'Europe/Paris',
      localStartDate: '2026-11-04',
      localEndDate: '2027-05-03',
    });
    expect(timing).toMatchObject({
      startDate: null,
      endDate: null,
      localStartDate: '2026-11-04',
      localStartTime: null,
      localEndTime: null,
    });
  });

  it('local date + time + zone → instant; local time with an unknown zone stays local', () => {
    expect(
      resolveEventTiming({
        ...none,
        timezone: 'Europe/Paris',
        localStartDate: '2026-11-04',
        localStartTime: '19:00',
      }).startDate?.toISOString(),
    ).toBe('2026-11-04T18:00:00.000Z');
    expect(
      resolveEventTiming({ ...none, localStartDate: '2026-11-04', localStartTime: '19:00' }),
    ).toMatchObject({
      startDate: null,
      timezone: null,
      localStartTime: '19:00',
    });
    // An unknown zone name is treated as unknown, not guessed.
    expect(
      resolveEventTiming({
        ...none,
        timezone: 'Mars/Olympus',
        localStartDate: '2026-11-04',
        localStartTime: '19:00',
      }).startDate,
    ).toBeNull();
  });

  it('refuses: no start, a malformed date/time, a time without a date, an end before the start', () => {
    expect(() => resolveEventTiming(none)).toThrow(RangeError);
    expect(() => resolveEventTiming({ ...none, localStartDate: '2026-02-30' })).toThrow(RangeError);
    expect(() =>
      resolveEventTiming({ ...none, localStartDate: '2026-02-01', localStartTime: '25:00' }),
    ).toThrow(RangeError);
    expect(() => resolveEventTiming({ ...none, localStartTime: '10:00' })).toThrow(RangeError);
    expect(() =>
      resolveEventTiming({ ...none, localStartDate: '2026-11-04', localEndDate: '2026-05-03' }),
    ).toThrow(RangeError);
    expect(() =>
      resolveEventTiming({
        startDate: new Date('2026-10-03T20:00:00Z'),
        endDate: new Date('2026-10-03T19:00:00Z'),
        timezone: null,
      }),
    ).toThrow(RangeError);
  });
});

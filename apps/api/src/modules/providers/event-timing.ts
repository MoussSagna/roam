import { isLocalDate, isLocalTime } from '../../database/local-date.js';

/**
 * Event timing (DATA_PERSISTENCE_AND_SYNC.md "NormalizedEvent"): instants, local dates and times, time zones. Pure, and
 * independent of the process time zone (every conversion goes through `Intl` with an explicit IANA zone).
 *
 * The rule: a time is never invented. A local date without a time stays a date; a local time without a zone stays a
 * local time; an instant exists only when the source gives one, or a local date + time + zone.
 */

export type EventTiming = {
  startDate: Date | null;
  endDate: Date | null;
  timezone: string | null;
  localStartDate: string | null;
  localStartTime: string | null;
  localEndDate: string | null;
  localEndTime: string | null;
};

/** True when `zone` is an IANA time zone this runtime knows. */
export function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The wall-clock date and time of an instant in a zone: { date: "YYYY-MM-DD", time: "HH:MM" }. */
export function instantToLocal(instant: Date, zone: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/**
 * The instant of a local date and time in a zone, or `null` when that wall-clock time does not exist there (the
 * spring-forward gap). An ambiguous time (autumn fall-back) resolves to its first occurrence.
 */
export function localToInstant(date: string, time: string, zone: string): Date | null {
  if (!isLocalDate(date) || !isLocalTime(time)) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  // Try the offsets in effect around that time; keep the candidates that read back as the same wall-clock time.
  const candidates = [-1, 0, 1]
    .map((days) => wall - offsetMs(new Date(wall + days * 86_400_000), zone))
    .filter((instant) => {
      const local = instantToLocal(new Date(instant), zone);
      return local.date === date && local.time === time;
    })
    .sort((a, b) => a - b);
  return candidates.length ? new Date(candidates[0]) : null;
}

/** Offset of `zone` from UTC at an instant, in ms (Paris summer: +2 h). */
function offsetMs(instant: Date, zone: string): number {
  const { date, time } = instantToLocal(instant, zone);
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - Math.floor(instant.getTime() / 60_000) * 60_000;
}

/**
 * Completes a provider event's timing without inventing anything: an instant + zone gives the local date and time; a
 * local date + time + zone gives the instant. Throws a `RangeError` when there is no start at all, a malformed value,
 * or an end before the start (the event is then skipped by the ingestion).
 */
export function resolveEventTiming(input: {
  startDate: Date | null;
  endDate: Date | null;
  timezone: string | null;
  localStartDate?: string | null;
  localStartTime?: string | null;
  localEndDate?: string | null;
  localEndTime?: string | null;
}): EventTiming {
  const zone = input.timezone && isTimeZone(input.timezone) ? input.timezone : null;
  const timing: EventTiming = {
    startDate: input.startDate,
    endDate: input.endDate,
    timezone: zone,
    localStartDate: input.localStartDate ?? null,
    localStartTime: input.localStartTime ?? null,
    localEndDate: input.localEndDate ?? null,
    localEndTime: input.localEndTime ?? null,
  };
  for (const date of [timing.localStartDate, timing.localEndDate])
    if (date !== null && !isLocalDate(date)) throw new RangeError('invalid local date');
  for (const time of [timing.localStartTime, timing.localEndTime])
    if (time !== null && !isLocalTime(time)) throw new RangeError('invalid local time');
  if (timing.localStartTime && !timing.localStartDate)
    throw new RangeError('local start time without a date');
  if (timing.localEndTime && !timing.localEndDate)
    throw new RangeError('local end time without a date');

  if (zone) {
    for (const [instantKey, dateKey, timeKey] of [
      ['startDate', 'localStartDate', 'localStartTime'],
      ['endDate', 'localEndDate', 'localEndTime'],
    ] as const) {
      const instant = timing[instantKey];
      if (instant) {
        const local = instantToLocal(instant, zone);
        timing[dateKey] ??= local.date;
        timing[timeKey] ??= local.time;
      } else if (timing[dateKey] && timing[timeKey]) {
        timing[instantKey] = localToInstant(timing[dateKey], timing[timeKey], zone);
      }
    }
  }

  if (!timing.startDate && !timing.localStartDate) throw new RangeError('event without a start');
  if (timing.startDate && timing.endDate && timing.endDate < timing.startDate)
    throw new RangeError('end before start');
  if (timing.localStartDate && timing.localEndDate) {
    const start = `${timing.localStartDate}T${timing.localStartTime ?? '00:00'}`;
    const end = `${timing.localEndDate}T${timing.localEndTime ?? '23:59'}`;
    if (end < start) throw new RangeError('end before start');
  }
  return timing;
}

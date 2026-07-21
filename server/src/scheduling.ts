import { prisma } from './db.js';

export type BusyEvent = {
  start: string;
  end: string;
  learning_goal?: string | null;
};

export type FreeSlot = {
  day: string;
  start_time: string;
  end_time: string;
};

type FindFreeSlotsOptions = {
  weeksAhead?: number;
  dayStart?: string;
  dayEnd?: string;
  baseDate?: Date;
  ignoreLearningGoalId?: string;
  timeZone?: string;
};

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

function parseClock(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time value: ${value}`);
  }
  return { hours, minutes };
}

function systemTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

function zonedDate(date: Date, timeZone: string): LocalDateParts {
  const parts = zonedParts(date, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

function localDateKey(value: LocalDateParts) {
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

function addLocalDays(value: LocalDateParts, days: number): LocalDateParts {
  const date = new Date(Date.UTC(value.year, value.month - 1, value.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function localWeekday(value: LocalDateParts) {
  return new Date(Date.UTC(value.year, value.month - 1, value.day)).getUTCDay();
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedTimeToUtc(day: LocalDateParts, clock: string, timeZone: string) {
  const { hours, minutes } = parseClock(clock);
  const localTimestamp = Date.UTC(day.year, day.month - 1, day.day, hours, minutes, 0, 0);
  let utc = new Date(localTimestamp - timeZoneOffsetMs(new Date(localTimestamp), timeZone));
  utc = new Date(localTimestamp - timeZoneOffsetMs(utc, timeZone));
  return utc;
}

function sameZonedDay(day: LocalDateParts, date: Date, timeZone: string) {
  return localDateKey(day) === localDateKey(zonedDate(date, timeZone));
}

function weekdayForSlot(isoDate: string, timeZone: string) {
  return localWeekday(zonedDate(new Date(isoDate), timeZone));
}

function ceilToNextMinutes(date: Date, stepMinutes: number) {
  const value = new Date(date);
  value.setSeconds(0, 0);
  const remainder = value.getMinutes() % stepMinutes;
  if (remainder !== 0) value.setMinutes(value.getMinutes() + (stepMinutes - remainder));
  return value;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function iso(value: Date) {
  return value.toISOString();
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

export function expectedSessionCount(weeklyHours: number, sessionLengthMinutes: number, weeksAhead = 2) {
  if (!Number.isFinite(weeklyHours) || weeklyHours <= 0) return 0;
  if (!Number.isFinite(sessionLengthMinutes) || sessionLengthMinutes <= 0) return 0;
  return Math.ceil((weeklyHours * 60) / sessionLengthMinutes) * weeksAhead;
}

export function findFreeSlotsFromEvents(
  events: BusyEvent[],
  weeklyHours: number,
  sessionLengthMinutes: number,
  options: FindFreeSlotsOptions = {},
): FreeSlot[] {
  const weeksAhead = options.weeksAhead ?? 2;
  const timeZone = options.timeZone || systemTimeZone();
  const sessionCountPerWeek = Math.ceil((weeklyHours * 60) / sessionLengthMinutes);
  if (sessionCountPerWeek <= 0 || weeksAhead <= 0) return [];

  const now = options.baseDate ?? new Date();
  const baseDateParts = zonedDate(now, timeZone);
  const base = zonedTimeToUtc(baseDateParts, '00:00', timeZone);
  const windowEnd = zonedTimeToUtc(addLocalDays(baseDateParts, weeksAhead * 7), '00:00', timeZone);
  const busy = events
    .filter((event) => !(options.ignoreLearningGoalId && event.learning_goal === options.ignoreLearningGoalId))
    .map((event) => ({ start: new Date(event.start), end: new Date(event.end) }))
    .filter((event) => !Number.isNaN(event.start.valueOf()) && !Number.isNaN(event.end.valueOf()) && event.end > base && event.start < windowEnd)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const slots: FreeSlot[] = [];

  for (let week = 0; week < weeksAhead; week += 1) {
    const weekCandidates: FreeSlot[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = addLocalDays(baseDateParts, week * 7 + dayIndex);
      let start = zonedTimeToUtc(day, options.dayStart ?? '08:00', timeZone);
      const end = zonedTimeToUtc(day, options.dayEnd ?? '22:00', timeZone);
      if (sameZonedDay(day, now, timeZone) && start < now) start = ceilToNextMinutes(now, 15);
      if (end <= start) continue;

      const dayBusy = busy
        .filter((event) => overlaps(start, end, event.start, event.end))
        .map((event) => ({
          start: new Date(Math.max(event.start.getTime(), start.getTime())),
          end: new Date(Math.min(event.end.getTime(), end.getTime())),
        }))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      let cursor = start;
      let foundForDay = false;
      for (const event of dayBusy) {
        if (event.start > cursor && event.start.getTime() - cursor.getTime() >= sessionLengthMinutes * 60_000) {
          weekCandidates.push({
            day: iso(zonedTimeToUtc(day, '00:00', timeZone)),
            start_time: iso(cursor),
            end_time: iso(addMinutes(cursor, sessionLengthMinutes)),
          });
          foundForDay = true;
          break;
        }
        if (event.end > cursor) cursor = event.end;
      }

      if (!foundForDay && end.getTime() - cursor.getTime() >= sessionLengthMinutes * 60_000) {
        weekCandidates.push({
          day: iso(zonedTimeToUtc(day, '00:00', timeZone)),
          start_time: iso(cursor),
          end_time: iso(addMinutes(cursor, sessionLengthMinutes)),
        });
      }
    }

    const usedWeekdays = new Set<number>();
    for (const candidate of weekCandidates) {
      if (slots.length >= (week + 1) * sessionCountPerWeek) break;
      const weekday = weekdayForSlot(candidate.start_time, timeZone);
      if (usedWeekdays.has(weekday) && usedWeekdays.size < 7) continue;
      slots.push(candidate);
      usedWeekdays.add(weekday);
    }

    for (const candidate of weekCandidates) {
      if (slots.length >= (week + 1) * sessionCountPerWeek) break;
      if (!slots.some((slot) => slot.start_time === candidate.start_time)) {
        slots.push(candidate);
      }
    }
  }

  return slots.slice(0, expectedSessionCount(weeklyHours, sessionLengthMinutes, weeksAhead));
}

export async function findFreeSlots(
  userId: string,
  weeklyHours: number,
  sessionLengthMinutes: number,
  options: FindFreeSlotsOptions = {},
) {
  const weeksAhead = options.weeksAhead ?? 2;
  const timeZone = options.timeZone || systemTimeZone();
  const baseDateParts = zonedDate(options.baseDate ?? new Date(), timeZone);
  const base = zonedTimeToUtc(baseDateParts, '00:00', timeZone);
  const windowEnd = zonedTimeToUtc(addLocalDays(baseDateParts, weeksAhead * 7), '00:00', timeZone);
  const rows = await prisma.entity.findMany({
    where: { userId, entityType: 'calendarEvents' },
  });
  const events = rows
    .map((row) => JSON.parse(row.data))
    .filter((event) => new Date(event.end).getTime() > base.getTime() && new Date(event.start).getTime() < windowEnd.getTime());

  return findFreeSlotsFromEvents(events, weeklyHours, sessionLengthMinutes, options);
}

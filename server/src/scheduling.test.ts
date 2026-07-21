import { describe, expect, it } from 'vitest';
import { expectedSessionCount, findFreeSlotsFromEvents, type BusyEvent } from './scheduling.js';

const baseDate = new Date(2026, 6, 20, 0, 0, 0, 0);

function at(dayOffset: number, hour: number, minute = 0) {
  const date = new Date(baseDate);
  date.setDate(baseDate.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function event(dayOffset: number, startHour: number, endHour: number): BusyEvent {
  return { start: at(dayOffset, startHour), end: at(dayOffset, endHour) };
}

function overlaps(slot: { start_time: string; end_time: string }, busy: BusyEvent) {
  return new Date(slot.start_time) < new Date(busy.end) && new Date(slot.end_time) > new Date(busy.start);
}

describe('findFreeSlotsFromEvents', () => {
  it('returns evenly distributed slots for an empty calendar', () => {
    const slots = findFreeSlotsFromEvents([], 3, 60, { weeksAhead: 1, dayStart: '08:00', dayEnd: '22:00', baseDate });

    expect(slots).toHaveLength(3);
    expect(new Set(slots.map((slot) => new Date(slot.start_time).getDay())).size).toBe(3);
    expect(slots.map((slot) => new Date(slot.start_time).getHours())).toEqual([8, 8, 8]);
  });

  it('returns no slots when the whole scheduling window is busy', () => {
    const busy = Array.from({ length: 7 }, (_, day) => event(day, 8, 22));
    const slots = findFreeSlotsFromEvents(busy, 3, 60, { weeksAhead: 1, dayStart: '08:00', dayEnd: '22:00', baseDate });

    expect(slots).toEqual([]);
  });

  it('skips partially occupied time and does not overlap existing events', () => {
    const busy = [
      event(0, 8, 12),
      event(1, 8, 22),
      event(2, 9, 10),
    ];
    const slots = findFreeSlotsFromEvents(busy, 3, 60, { weeksAhead: 1, dayStart: '08:00', dayEnd: '22:00', baseDate });

    expect(slots).toHaveLength(3);
    expect(slots.every((slot) => busy.every((busyEvent) => !overlaps(slot, busyEvent)))).toBe(true);
    expect(new Date(slots[0].start_time).getHours()).toBe(12);
  });

  it('rounds up when weekly hours are not divisible by session length', () => {
    expect(expectedSessionCount(2.5, 60, 1)).toBe(3);

    const slots = findFreeSlotsFromEvents([], 2.5, 60, { weeksAhead: 1, dayStart: '08:00', dayEnd: '22:00', baseDate });

    expect(slots).toHaveLength(3);
  });

  it('does not schedule earlier than the current time on the base day', () => {
    const lateBase = new Date(2026, 6, 20, 11, 47, 0, 0);
    const slots = findFreeSlotsFromEvents([], 1, 60, { weeksAhead: 1, dayStart: '08:00', dayEnd: '22:00', baseDate: lateBase });

    expect(slots).toHaveLength(1);
    expect(new Date(slots[0].start_time).getHours()).toBe(12);
    expect(new Date(slots[0].start_time).getMinutes()).toBe(0);
  });

  it('uses the selected IANA timezone instead of the server timezone', () => {
    const slots = findFreeSlotsFromEvents([], 1, 60, {
      weeksAhead: 1,
      dayStart: '08:00',
      dayEnd: '22:00',
      baseDate: new Date('2026-07-20T04:00:00.000Z'),
      timeZone: 'America/New_York',
    });

    expect(slots).toHaveLength(1);
    expect(slots[0].start_time).toBe('2026-07-20T12:00:00.000Z');
  });
});

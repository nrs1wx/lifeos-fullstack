import { describe, expect, it } from 'vitest';
import { validateCalendarEvent, validateEntity } from './entityValidation.js';

describe('календарь: серверная проверка времени', () => {
  it('не разрешает окончание раньше или равно началу', () => {
    expect(validateCalendarEvent({ title: 'Встреча', type: 'work', start: '2026-07-20T10:00:00.000Z', end: '2026-07-20T10:00:00.000Z' })).toBe('Время окончания должно быть позже времени начала.');
  });
  it('принимает корректный интервал', () => {
    expect(validateCalendarEvent({ title: 'Встреча', type: 'work', start: '2026-07-20T10:00:00.000Z', end: '2026-07-20T11:00:00.000Z' })).toBeNull();
  });
});

describe('learning plans: server validation', () => {
  it('принимает learning plan с полем goal', () => {
    expect(validateEntity('learningPlans', {
      id: 'plan-1',
      goal: 'Learn English B1',
      durationWeeks: 4,
      weeks: [],
    })).toBeNull();
  });
});

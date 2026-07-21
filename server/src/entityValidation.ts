import { EntityType } from './entityTypes.js';

/** Проверяет входные данные каждого модуля до записи JSON в БД. */
export function validateEntity(type: EntityType, value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Данные записи должны быть объектом.';
  const entity = value as Record<string, unknown>;
  if (typeof entity.id !== 'undefined' && (typeof entity.id !== 'string' && typeof entity.id !== 'number')) return 'Некорректный идентификатор записи.';
  const titleTypes: EntityType[] = ['goals', 'habits', 'notes', 'learningPlans', 'subscriptions'];
  if (titleTypes.includes(type)) {
    const title = entity.title ?? entity.name ?? entity.destination ?? entity.subject ?? entity.goal;
    if (typeof title !== 'string' || !title.trim()) return 'Укажите название записи.';
  }
  if (type === 'goals' && entity.progress !== undefined && (!Number.isFinite(Number(entity.progress)) || Number(entity.progress) < 0 || Number(entity.progress) > 100)) return 'Прогресс должен быть от 0 до 100%.';
  if (type === 'finances' && (!Number.isFinite(Number(entity.amount)) || Number(entity.amount) <= 0)) return 'Сумма должна быть больше нуля.';
  if (type === 'healthLogs' && entity.weight !== undefined && (!Number.isFinite(Number(entity.weight)) || Number(entity.weight) <= 0 || Number(entity.weight) > 500)) return 'Укажите корректный вес.';
  if (type === 'calendarEvents') return validateCalendarEvent(entity);
  return null;
}

export function validateCalendarEvent(event: Record<string, unknown>): string | null {
  if (typeof event.title !== 'string' || !event.title.trim()) return 'Укажите название события.';
  const start = new Date(String(event.start));
  const end = new Date(String(event.end));
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return 'Укажите корректные дату и время.';
  if (end <= start) return 'Время окончания должно быть позже времени начала.';
  if (typeof event.type !== 'string' || !['work', 'personal', 'health', 'other', 'learning', 'low-value'].includes(event.type)) return 'Укажите корректный тип события.';
  return null;
}

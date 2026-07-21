// Список типов сущностей, которыми управляют модули фронтенда через
// generic addEntity/updateEntity/deleteEntity в src/store.tsx.
// Это "белый список" — запросы с любым другим entityType отклоняются.
export const ENTITY_TYPES = [
  'goals',
  'habits',
  'finances',
  'healthLogs',
  'notes',
  'learningPlans',
  'calendarEvents',
  'subscriptions',
  'labResults',
  'weatherForecast',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export function isEntityType(value: string): value is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value);
}

export function defaultSeedData(): Record<EntityType, any[]> {
  return {
    goals: [],
    habits: [],
    finances: [],
    healthLogs: [],
    notes: [],
    learningPlans: [],
    calendarEvents: [],
    subscriptions: [],
    labResults: [],
    weatherForecast: [],
  };
}

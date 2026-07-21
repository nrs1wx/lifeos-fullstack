export const TIMEZONE_SETTING_KEY = 'lifeos-timezone';

export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function getStoredTimeZone() {
  return localStorage.getItem(TIMEZONE_SETTING_KEY) || browserTimeZone();
}

function timeZoneOffsetLabel(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date());
    return parts.find((part) => part.type === 'timeZoneName')?.value || '';
  } catch {
    return '';
  }
}

export function formatTimeZoneLabel(timeZone: string) {
  const offset = timeZoneOffsetLabel(timeZone);
  return offset ? `${timeZone} (${offset})` : timeZone;
}

export function getTimeZoneOptions() {
  const supported = typeof (Intl as any).supportedValuesOf === 'function'
    ? ((Intl as any).supportedValuesOf('timeZone') as string[])
    : ['UTC', browserTimeZone()];
  return Array.from(new Set([...supported, getStoredTimeZone(), browserTimeZone(), 'UTC']))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function safeTimeZone(value: unknown) {
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return value;
  } catch {
    return fallback;
  }
}


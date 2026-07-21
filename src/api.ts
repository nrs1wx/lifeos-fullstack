// Тонкий клиент для общения с backend (server/). Все данные LifeOS теперь
// живут в SQLite через Express + Prisma, а не в localStorage — здесь
// хранится только JWT-токен сессии.

const TOKEN_KEY = 'lifeos-token';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status?: number;
  code?: string;
  body?: any;
}

export type AiSuggestedAction = {
  id: string;
  kind: 'create_entity';
  label: string;
  entityType: string;
  entity: Record<string, any>;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const error = new ApiError(body?.error || `Request failed: ${res.status}`);
    error.status = res.status;
    error.code = body?.code;
    error.body = body;
    throw error;
  }
  return body as T;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  checkEmail: (email: string) => request<{ available: boolean }>(`/auth/check-email?email=${encodeURIComponent(email)}`),
  me: () => request<{ user: any }>('/auth/me'),
  bootstrap: () => request<Record<string, any>>('/bootstrap'),
  updateProfile: (updates: { name?: string; city?: string }) =>
    request<{ userProfile: { name: string; city: string } }>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteAccount: () => request<void>('/account', { method: 'DELETE' }),
  addEntity: (type: string, entity: any) =>
    request<any>(`/entities/${type}`, { method: 'POST', body: JSON.stringify(entity) }),
  updateEntity: (type: string, id: string, updates: any) =>
    request<any>(`/entities/${type}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteEntity: (type: string, id: string) =>
    request<void>(`/entities/${type}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  aiChat: (message: string, context?: Record<string, any>) =>
    request<{ reply: string; actions?: AiSuggestedAction[] }>('/ai/chat', { method: 'POST', body: JSON.stringify({ message, context }) }),
  generateLearningPlan: (goal: string, startDate: string, endDate: string, context?: Record<string, any>) =>
    request<{ plan: any }>('/ai/learning-plan', {
      method: 'POST',
      body: JSON.stringify({ goal, startDate, endDate, context }),
    }),
  scheduleLearningPlan: (id: string, options: { timezone?: string; weeksAhead?: number } = {}) =>
    request<{ created: any[]; count: number; expected: number; timeZone?: string }>(`/learning/${encodeURIComponent(id)}/schedule`, {
      method: 'POST',
      body: JSON.stringify(options),
    }),
  learning: {
    schedule: (id: string, options: { timezone?: string; weeksAhead?: number } = {}) =>
      request<{ created: any[]; count: number; expected: number; timeZone?: string }>(`/learning/${encodeURIComponent(id)}/schedule`, {
        method: 'POST',
        body: JSON.stringify(options),
      }),
  },
};

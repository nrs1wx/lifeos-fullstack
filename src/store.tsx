import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, clearToken } from './api';

export type AiDataAccess = {
  goals: boolean;
  habits: boolean;
  calendarEvents: boolean;
  healthLogs: boolean;
  labResults: boolean;
  finances: boolean;
  subscriptions: boolean;
  notes: boolean;
  learningPlans: boolean;
  weatherForecast: boolean;
};

export const DEFAULT_AI_DATA_ACCESS: AiDataAccess = {
  goals: true,
  habits: true,
  calendarEvents: true,
  healthLogs: true,
  labResults: true,
  finances: true,
  subscriptions: true,
  notes: true,
  learningPlans: true,
  weatherForecast: true,
};

const AI_DATA_ACCESS_KEY = 'lifeos-ai-data-access';
const CURRENCY_KEY = 'lifeos-currency';

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
};

function readAiDataAccess(): AiDataAccess {
  try {
    const parsed = JSON.parse(localStorage.getItem(AI_DATA_ACCESS_KEY) || '{}');
    return { ...DEFAULT_AI_DATA_ACCESS, ...parsed };
  } catch {
    return DEFAULT_AI_DATA_ACCESS;
  }
}

// Common Types
export interface ActionEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface StoreState {
  events: any[];
  goals: any[];
  habits: any[];
  finances: any[];
  healthLogs: any[];
  notes: any[];
  learningPlans: any[];
  calendarEvents: any[];
  subscriptions: any[];
  labResults: any[];
  weatherForecast: any[];
  recentActivity: ActionEvent[];
  toasts: Toast[];
  userProfile: {
    name: string;
    city: string;
    email?: string;
  };
  learningPlan: any;

  isLoading: boolean;
  loadError: string | null;
  retryLoad: () => void;

  isNewEntryModalOpen: boolean;
  setNewEntryModalOpen: (open: boolean) => void;

  // Actions
  addActivity: (msg: string, type: string) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info', options?: { actionLabel?: string; onAction?: () => void; durationMs?: number }) => void;
  removeToast: (id: string) => void;

  // Generic CRUD — теперь синхронизируется с backend (server/), а не localStorage.
  addEntity: (entityType: string, entity: any) => Promise<any>;
  updateEntity: (entityType: string, id: string, updates: any, options?: { silent?: boolean }) => Promise<any>;
  deleteEntity: (entityType: string, id: string) => Promise<void>;
  mergeCalendarEvents: (events: any[]) => void;
  replaceLearningSchedule: (learningGoalId: string, events: any[]) => void;

  // Specific for backward compatibility
  addGoal: (goal: any) => Promise<any>;
  updateGoal: (id: string, updates: any) => Promise<any>;

  // Profile & session
  updateProfile: (updates: { name?: string; city?: string }) => Promise<any>;
  language: 'ru' | 'kz' | 'en';
  setLanguage: (language: 'ru' | 'kz' | 'en') => void;
  currency: string;
  setCurrency: (currency: string) => void;
  aiDataAccess: AiDataAccess;
  setAiDataAccess: (updates: Partial<AiDataAccess>) => void;
  logout: () => void;
  deleteAccount: () => Promise<void>;
}

const StoreContext = createContext<StoreState | null>(null);

const emptyState = {
  events: [],
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
  recentActivity: [] as ActionEvent[],
  userProfile: {
    name: '',
    city: '',
    email: '',
  },
  learningPlan: { focus: 'Foundations of Python', courses: [] },
};

const ENTITY_KEYS = new Set([
  'goals', 'habits', 'finances', 'healthLogs', 'notes',
  'learningPlans', 'calendarEvents', 'subscriptions',
  'labResults', 'weatherForecast',
]);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<typeof emptyState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadNonce, setLoadNonce] = useState(0);
  const [language, setLanguageState] = useState<'ru' | 'kz' | 'en'>(() => (localStorage.getItem('lifeos-language') as 'ru' | 'kz' | 'en') || 'en');
  const [currency, setCurrencyState] = useState(() => localStorage.getItem(CURRENCY_KEY) || 'USD');
  const [aiDataAccess, setAiDataAccessState] = useState<AiDataAccess>(readAiDataAccess);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isNewEntryModalOpen, setNewEntryModalOpen] = useState(false);

  // Один bootstrap до первого рендера экранов: пустые значения никогда не маскируют ошибку загрузки.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await api.bootstrap();
        if (!cancelled) {
          setState((prev) => ({ ...prev, ...data }));
        }
      } catch (e) {
        console.error('Failed to load data from server', e);
        if (!cancelled) {
          setLoadError('Could not load your data. Check the connection and try again.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadNonce]);

  const addActivity = (message: string, type: string) => {
    setState((prev) => ({
      ...prev,
      recentActivity: [
        {
          id: Math.random().toString(36).substring(2, 9),
          type,
          message,
          timestamp: new Date().toISOString(),
        },
        ...prev.recentActivity,
      ].slice(0, 20),
    }));
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success', options: { actionLabel?: string; onAction?: () => void; durationMs?: number } = {}) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, actionLabel: options.actionLabel, onAction: options.onAction }]);
    setTimeout(() => {
      removeToast(id);
    }, options.durationMs ?? 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addEntity = async (entityType: string, entity: any) => {
    if (!ENTITY_KEYS.has(entityType)) throw new Error('Unknown record type.');
    try {
      const saved = await api.addEntity(entityType, entity);
      setState((prev) => ({ ...prev, [entityType]: [...(prev as any)[entityType], saved] }));
      addToast('Saved');
      return saved;
    } catch (err: any) {
      addToast(err?.message || 'Could not save record', 'error');
      throw err;
    }
  };

  const updateEntity = async (entityType: string, id: string, updates: any, options: { silent?: boolean } = {}) => {
    if (!ENTITY_KEYS.has(entityType)) throw new Error('Unknown record type.');
    try {
      const saved = await api.updateEntity(entityType, String(id), updates);
      setState((prev) => ({ ...prev, [entityType]: (prev as any)[entityType].map((e: any) => String(e.id) === String(id) ? saved : e) }));
      if (!options.silent) addToast('Saved');
      return saved;
    } catch (err: any) {
      addToast(err?.message || 'Could not save changes', 'error');
      throw err;
    }
  };

  const deleteEntity = async (entityType: string, id: string) => {
    if (!ENTITY_KEYS.has(entityType)) throw new Error('Unknown record type.');
    let deletedEntity: any = null;
    try {
      setState((prev) => {
        deletedEntity = (prev as any)[entityType].find((e: any) => String(e.id) === String(id));
        return prev;
      });
      await api.deleteEntity(entityType, String(id));
      setState((prev) => ({ ...prev, [entityType]: (prev as any)[entityType].filter((e: any) => String(e.id) !== String(id)) }));
      addToast('Deleted', 'info', deletedEntity ? {
        actionLabel: 'Undo',
        durationMs: 7000,
        onAction: () => {
          addEntity(entityType, deletedEntity).then(() => addActivity('Restored deleted record', 'System'));
        },
      } : undefined);
    } catch (err: any) {
      addToast(err?.message || 'Could not delete record', 'error');
      throw err;
    }
  };

  const mergeCalendarEvents = (events: any[]) => {
    setState((prev) => {
      const incoming = events.filter(Boolean);
      const incomingIds = new Set(incoming.map((event) => String(event.id)));
      return {
        ...prev,
        calendarEvents: [
          ...prev.calendarEvents.filter((event: any) => !incomingIds.has(String(event.id))),
          ...incoming,
        ],
      };
    });
  };

  const replaceLearningSchedule = (learningGoalId: string, events: any[]) => {
    const now = Date.now();
    setState((prev) => {
      const incoming = events.filter(Boolean);
      const incomingIds = new Set(incoming.map((event) => String(event.id)));
      return {
        ...prev,
        calendarEvents: [
          ...prev.calendarEvents.filter((event: any) => {
            if (incomingIds.has(String(event.id))) return false;
            if (event.learning_goal !== learningGoalId) return true;
            return new Date(event.start).getTime() <= now;
          }),
          ...incoming,
        ],
      };
    });
  };

  // Keep for backward compatibility with existing components
  const updateGoal = (id: string, updates: any) => updateEntity('goals', id, updates);
  const addGoal = (goal: any) => addEntity('goals', goal);

  const updateProfile = async (updates: { name?: string; city?: string }) => {
    try {
      const saved = await api.updateProfile(updates);
      setState((prev) => ({ ...prev, userProfile: saved.userProfile }));
      addToast('Profile saved');
      return saved;
    } catch (err: any) {
      addToast(err?.message || 'Could not save profile', 'error');
      throw err;
    }
  };

  const logout = () => {
    clearToken();
    window.location.reload();
  };

  const setLanguage = (nextLanguage: 'ru' | 'kz' | 'en') => {
    setLanguageState(nextLanguage);
    localStorage.setItem('lifeos-language', nextLanguage);
    document.documentElement.lang = nextLanguage === 'kz' ? 'kk' : nextLanguage;
    addToast('Language saved');
  };

  const setCurrency = (nextCurrency: string) => {
    setCurrencyState(nextCurrency);
    localStorage.setItem(CURRENCY_KEY, nextCurrency);
    addToast('Currency saved');
  };

  const setAiDataAccess = (updates: Partial<AiDataAccess>) => {
    setAiDataAccessState((current) => {
      const next = { ...current, ...updates };
      localStorage.setItem(AI_DATA_ACCESS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const deleteAccount = async () => {
    await api.deleteAccount();
    clearToken();
    localStorage.removeItem('lifeos-token');
    window.location.reload();
  };

  return (
    <StoreContext.Provider
      value={{
        ...state,
        isLoading,
        loadError,
        retryLoad: () => setLoadNonce((value) => value + 1),
        toasts,
        isNewEntryModalOpen,
        setNewEntryModalOpen,
        addActivity, addToast, removeToast,
        addEntity, updateEntity, deleteEntity, mergeCalendarEvents, replaceLearningSchedule,
        updateGoal, addGoal,
        updateProfile, logout,
        language, setLanguage,
        currency, setCurrency,
        aiDataAccess, setAiDataAccess,
        deleteAccount,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { View } from './types';
import { StoreProvider, useStore } from './store';
import { api, getToken, clearToken } from './api';

type AppState = 'landing' | 'auth' | 'onboarding' | 'app' | 'checking';

const Dashboard = lazy(() => import('./views/Dashboard').then((module) => ({ default: module.Dashboard })));
const Calendar = lazy(() => import('./views/Calendar').then((module) => ({ default: module.Calendar })));
const Habits = lazy(() => import('./views/Habits').then((module) => ({ default: module.Habits })));
const Health = lazy(() => import('./views/Health').then((module) => ({ default: module.Health })));
const Finance = lazy(() => import('./views/Finance').then((module) => ({ default: module.Finance })));
const AIAssistant = lazy(() => import('./views/AIAssistant').then((module) => ({ default: module.AIAssistant })));
const Onboarding = lazy(() => import('./views/Onboarding').then((module) => ({ default: module.Onboarding })));
const Auth = lazy(() => import('./views/Auth').then((module) => ({ default: module.Auth })));
const Landing = lazy(() => import('./views/Landing').then((module) => ({ default: module.Landing })));
const Goals = lazy(() => import('./views/Goals').then((module) => ({ default: module.Goals })));
const Learning = lazy(() => import('./views/Learning').then((module) => ({ default: module.Learning })));
const Notes = lazy(() => import('./views/Notes').then((module) => ({ default: module.Notes })));
const Analytics = lazy(() => import('./views/Analytics').then((module) => ({ default: module.Analytics })));
const Settings = lazy(() => import('./views/Settings').then((module) => ({ default: module.Settings })));

const APP_VIEWS: View[] = ['dashboard', 'calendar', 'habits', 'health', 'finance', 'ai', 'goals', 'learning', 'notes', 'analytics', 'settings'];

function readDefaultView(): View {
  const saved = localStorage.getItem('lifeos-default-view') as View | null;
  return saved && APP_VIEWS.includes(saved) ? saved : 'dashboard';
}

function resolveThemeMode(mode: string | null) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function ViewFallback() {
  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="animate-pulse max-w-5xl mx-auto space-y-5">
        <div className="h-10 w-52 bg-surface-variant rounded" />
        <div className="h-72 bg-surface-variant rounded-2xl" />
      </div>
    </div>
  );
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('checking');
  const [currentView, setCurrentView] = useState<View>(() => readDefaultView());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('lifeos-theme') || 'system');

  // При загрузке страницы проверяем, есть ли действующий токен сессии на backend.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAppState('landing');
      return;
    }
    api.me()
      .then(() => setAppState('app'))
      .catch(() => {
        clearToken();
        setAppState('landing');
      });
  }, []);

  useEffect(() => {
    setIsDarkMode(resolveThemeMode(themeMode));

    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCurrentView(customEvent.detail as View);
      }
    };
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const nextMode = customEvent.detail || localStorage.getItem('lifeos-theme') || 'system';
      setThemeMode(nextMode);
      setIsDarkMode(resolveThemeMode(nextMode));
    };
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemTheme = () => {
      if ((localStorage.getItem('lifeos-theme') || 'system') === 'system') {
        setIsDarkMode(media.matches);
      }
    };
    window.addEventListener('navigate', handleNavigate);
    window.addEventListener('lifeos-theme-change', handleThemeChange);
    media.addEventListener('change', handleSystemTheme);
    return () => {
      window.removeEventListener('navigate', handleNavigate);
      window.removeEventListener('lifeos-theme-change', handleThemeChange);
      media.removeEventListener('change', handleSystemTheme);
    };
  }, [themeMode]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    const nextMode = isDarkMode ? 'light' : 'dark';
    localStorage.setItem('lifeos-theme', nextMode);
    setThemeMode(nextMode);
    setIsDarkMode(resolveThemeMode(nextMode));
  };

  const handleLogin = (isNewUser: boolean) => {
    if (isNewUser) {
      setAppState('onboarding');
    } else {
      setAppState('app');
      setCurrentView(readDefaultView());
    }
  };

  const handleOnboardingComplete = () => {
    setAppState('app');
    setCurrentView(readDefaultView());
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'calendar': return <Calendar />;
      case 'habits': return <Habits />;
      case 'health': return <Health />;
      case 'finance': return <Finance />;
      case 'ai': return <AIAssistant />;
      case 'goals': return <Goals />;
      case 'learning': return <Learning />;
      case 'notes': return <Notes />;
      case 'analytics': return <Analytics />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  if (appState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface-variant text-[14px]">
        Loading LifeOS…
      </div>
    );
  }

  if (appState === 'landing') {
    return <Suspense fallback={<ViewFallback />}><Landing onEnter={() => setAppState('auth')} /></Suspense>;
  }

  if (appState === 'auth') {
    return <Suspense fallback={<ViewFallback />}><Auth onLogin={handleLogin} /></Suspense>;
  }

  if (appState === 'onboarding') {
    return <Suspense fallback={<ViewFallback />}><Onboarding onComplete={handleOnboardingComplete} /></Suspense>;
  }

  return (
    <StoreProvider>
      <AuthenticatedShell currentView={currentView} setCurrentView={setCurrentView} isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
        <Suspense fallback={<ViewFallback />}>{renderView()}</Suspense>
      </AuthenticatedShell>
    </StoreProvider>
  );
}

function AuthenticatedShell({ currentView, setCurrentView, isDarkMode, toggleTheme, children }: { currentView: View; setCurrentView: (view: View) => void; isDarkMode: boolean; toggleTheme: () => void; children: React.ReactNode }) {
  const { isLoading, loadError, retryLoad } = useStore();
  if (isLoading) return <div className="min-h-screen p-8 bg-background"><div className="animate-pulse max-w-5xl mx-auto space-y-5"><div className="h-10 w-52 bg-surface-variant rounded" /><div className="h-72 bg-surface-variant rounded-2xl" /></div></div>;
  if (loadError) return <div className="min-h-screen flex items-center justify-center p-5 bg-background"><div className="max-w-md text-center bg-surface p-7 rounded-2xl border border-outline-variant"><p className="text-on-surface mb-4">{loadError}</p><button onClick={retryLoad} className="bg-primary text-on-primary px-4 py-2 rounded-lg">Try again</button></div></div>;
  return (
      <Layout 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      >
        {children}
      </Layout>
  );
}

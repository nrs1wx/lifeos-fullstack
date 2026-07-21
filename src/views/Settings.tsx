import React, { useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Database,
  Download,
  Eye,
  Globe,
  LayoutDashboard,
  Monitor,
  Palette,
  RotateCcw,
  Shield,
  Sparkles,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useStore } from '../store';
import { View } from '../types';
import { browserTimeZone, formatTimeZoneLabel, getTimeZoneOptions, TIMEZONE_SETTING_KEY } from '../timezone';

type SettingsTab = 'account' | 'appearance' | 'calendar' | 'finance' | 'ai' | 'data' | 'diagnostics';

const viewOptions: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'learning', label: 'Learning' },
  { id: 'finance', label: 'Finance' },
  { id: 'habits', label: 'Habits' },
  { id: 'health', label: 'Health' },
  { id: 'goals', label: 'Goals' },
  { id: 'notes', label: 'Notes' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'ai', label: 'AI Assistant' },
];

function readSetting(key: string, fallback: string) {
  return localStorage.getItem(key) || fallback;
}

function useLocalSetting(key: string, fallback: string) {
  const [value, setValueState] = useState(() => readSetting(key, fallback));
  const setValue = (next: string) => {
    setValueState(next);
    localStorage.setItem(key, next);
  };
  return [value, setValue] as const;
}

function SettingCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
      <div className="mb-4">
        <h4 className="font-heading text-[17px] font-bold text-on-surface">{title}</h4>
        {desc && <p className="mt-1 text-[13px] text-on-surface-variant leading-relaxed">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant mb-2">{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return 'w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary';
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-surface-variant'}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-3' : '-translate-x-4'}`} />
    </button>
  );
}

export function Settings() {
  const store = useStore();
  const {
    userProfile,
    language,
    setLanguage,
    currency,
    setCurrency,
    addToast,
    addActivity,
    updateProfile,
    logout,
    deleteAccount,
    aiDataAccess,
    setAiDataAccess,
  } = store;

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [firstName, setFirstName] = useState(userProfile.name.split(' ')[0] || '');
  const [lastName, setLastName] = useState(userProfile.name.split(' ').slice(1).join(' ') || '');
  const [city, setCity] = useState(userProfile.city || '');
  const [email] = useState(userProfile.email || '');

  const [themeMode, setThemeModeState] = useLocalSetting('lifeos-theme', 'system');
  const [defaultView, setDefaultView] = useLocalSetting('lifeos-default-view', 'dashboard');
  const [density, setDensity] = useLocalSetting('lifeos-density', 'comfortable');
  const [timeFormat, setTimeFormat] = useLocalSetting('lifeos-time-format', '24h');
  const [dateFormat, setDateFormat] = useLocalSetting('lifeos-date-format', 'yyyy-mm-dd');
  const [timeZone, setTimeZone] = useLocalSetting(TIMEZONE_SETTING_KEY, browserTimeZone());

  const [calendarView, setCalendarView] = useLocalSetting('lifeos-calendar-default-view', 'week');
  const [weekStartsOn, setWeekStartsOn] = useLocalSetting('lifeos-week-starts-on', 'monday');
  const [workingStart, setWorkingStart] = useLocalSetting('lifeos-working-start', '08:00');
  const [workingEnd, setWorkingEnd] = useLocalSetting('lifeos-working-end', '22:00');
  const [studyStart, setStudyStart] = useLocalSetting('lifeos-study-start', '18:00');
  const [studyEnd, setStudyEnd] = useLocalSetting('lifeos-study-end', '21:00');
  const [defaultEventDuration, setDefaultEventDuration] = useLocalSetting('lifeos-default-event-duration', '60');
  const [showWeekends, setShowWeekends] = useLocalSetting('lifeos-show-weekends', 'true');
  const [showAiSessions, setShowAiSessions] = useLocalSetting('lifeos-show-ai-learning-sessions', 'true');

  const [monthlyBudget, setMonthlyBudget] = useLocalSetting('lifeos-finance-monthly-budget', '');
  const [diningBudget, setDiningBudget] = useLocalSetting('lifeos-budget-dining', '');
  const [transportBudget, setTransportBudget] = useLocalSetting('lifeos-budget-transport', '');
  const [defaultExpenseCategory, setDefaultExpenseCategory] = useLocalSetting('lifeos-default-expense-category', 'Dining');
  const [financeForecast, setFinanceForecast] = useLocalSetting('lifeos-finance-forecast', 'true');
  const [exportFormat, setExportFormat] = useLocalSetting('lifeos-export-format', 'csv');

  const [masterNotifications, setMasterNotifications] = useLocalSetting('lifeos-notifications-master', 'true');
  const [calendarNotifications, setCalendarNotifications] = useLocalSetting('lifeos-notifications-calendar', 'true');
  const [learningNotifications, setLearningNotifications] = useLocalSetting('lifeos-notifications-learning', 'true');
  const [budgetNotifications, setBudgetNotifications] = useLocalSetting('lifeos-notifications-budget', 'true');
  const [quietStart, setQuietStart] = useLocalSetting('lifeos-quiet-start', '22:00');
  const [quietEnd, setQuietEnd] = useLocalSetting('lifeos-quiet-end', '08:00');

  const [aiConfirmation, setAiConfirmation] = useLocalSetting('lifeos-ai-confirm-actions', 'true');
  const [aiTone, setAiTone] = useLocalSetting('lifeos-ai-tone', 'concise');
  const [maskFinance, setMaskFinance] = useLocalSetting('lifeos-mask-finance', 'false');

  const hasAiContextEnabled = Object.values(aiDataAccess).some(Boolean);
  const apiBase = import.meta.env.VITE_API_URL || '/api';
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);

  const aiPreview = useMemo(() => ({
    goals: store.goals.length,
    habits: store.habits.length,
    calendarEvents: store.calendarEvents.length,
    finances: store.finances.length,
    healthLogs: store.healthLogs.length,
    notes: store.notes.length,
    learningPlans: store.learningPlans.length,
  }), [store.goals.length, store.habits.length, store.calendarEvents.length, store.finances.length, store.healthLogs.length, store.notes.length, store.learningPlans.length]);

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'ai', label: 'AI & Privacy', icon: Shield },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'diagnostics', label: 'Diagnostics', icon: Monitor },
  ];

  const setThemeMode = (next: string) => {
    setThemeModeState(next);
    window.dispatchEvent(new CustomEvent('lifeos-theme-change', { detail: next }));
    addToast(`Theme set to ${next}`);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${firstName} ${lastName}`.trim();
    updateProfile({ name: fullName, city });
    addActivity('Updated personal profile', 'Settings');
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      userProfile,
      goals: store.goals,
      habits: store.habits,
      finances: store.finances,
      healthLogs: store.healthLogs,
      notes: store.notes,
      learningPlans: store.learningPlans,
      calendarEvents: store.calendarEvents,
      subscriptions: store.subscriptions,
      labResults: store.labResults,
      weatherForecast: store.weatherForecast,
      settings: {
        language,
        currency,
        themeMode,
        defaultView,
        density,
        timeFormat,
        dateFormat,
        timeZone,
      },
    };
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `lifeos-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    addToast('Data exported successfully');
    addActivity('Exported account data', 'Settings');
  };

  const handleCopyDiagnostics = () => {
    const text = [
      `API base: ${apiBase}`,
      `Theme: ${themeMode}`,
      `Default view: ${defaultView}`,
      `Currency: ${currency}`,
      `Language: ${language}`,
      `Time zone: ${timeZone}`,
      `Goals: ${store.goals.length}`,
      `Calendar events: ${store.calendarEvents.length}`,
      `Finance transactions: ${store.finances.length}`,
      `Learning plans: ${store.learningPlans.length}`,
    ].join('\n');
    navigator.clipboard?.writeText(text);
    addToast('Diagnostics copied');
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm('Are you sure you want to permanently delete your account and all server data? This action cannot be undone.');
    if (confirmed) {
      deleteAccount().catch((err: any) => addToast(err?.message || 'Could not delete account', 'error'));
    }
  };

  const resetUiSettings = () => {
    setThemeMode('system');
    setDefaultView('dashboard');
    setDensity('comfortable');
    setTimeFormat('24h');
    setDateFormat('yyyy-mm-dd');
    addToast('Appearance settings reset');
  };

  const aiAccessGroups = [
    { key: 'goals', title: 'Goals', desc: 'Goal titles, progress, deadlines, and milestones' },
    { key: 'habits', title: 'Habits', desc: 'Habit names, streaks, categories, and completion data' },
    { key: 'calendarEvents', title: 'Calendar', desc: 'Event titles, local times, types, and descriptions' },
    { key: 'healthLogs', title: 'Health Logs', desc: 'Body metrics, symptoms, sleep, water, and journal fields' },
    { key: 'labResults', title: 'Lab Results', desc: 'Test names, values, units, dates, and reference ranges' },
    { key: 'finances', title: 'Finance', desc: 'Transaction names, amounts, categories, and dates' },
    { key: 'subscriptions', title: 'Subscriptions', desc: 'Subscription names, costs, and renewal dates' },
    { key: 'notes', title: 'Notes', desc: 'Note titles, tags, and summarized content snippets' },
    { key: 'learningPlans', title: 'Learning Plans', desc: 'Roadmaps, tasks, dates, and linked goals' },
    { key: 'weatherForecast', title: 'Weather', desc: 'Saved forecast records used for health and scheduling context' },
  ] as const;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative pb-20 lg:pb-0">
      <TopBar showMobileTitle={false} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden h-full">
        <aside className="hidden lg:flex lg:col-span-3 border-r border-outline-variant bg-surface flex-col h-full z-10 p-6">
          <h2 className="text-[24px] font-heading font-bold text-on-surface mb-6">Settings</h2>

          <div className="flex items-center gap-3 p-4 bg-surface-container-low border border-outline-variant rounded-xl mb-6">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-[18px]">
              {(userProfile.name || userProfile.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-on-surface text-[14px] truncate">{userProfile.name || 'User'}</h4>
              <p className="text-[12px] text-on-surface-variant truncate">{userProfile.email || 'Local account'}</p>
            </div>
          </div>

          <div className="space-y-1 flex-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2 text-left px-4 py-2.5 font-medium text-[14px] rounded-lg transition-colors ${
                  activeTab === id ? 'bg-surface-variant text-on-surface' : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </aside>

        <div className="lg:hidden flex overflow-x-auto border-b border-outline-variant shrink-0 p-2 custom-scrollbar">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 text-[13px] font-medium whitespace-nowrap rounded-full transition-colors ${activeTab === id ? 'bg-surface-variant text-on-surface' : 'text-on-surface-variant'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <main className="lg:col-span-9 bg-background h-full overflow-y-auto custom-scrollbar p-4 lg:p-10">
          <div className="max-w-4xl w-full space-y-6">
            {activeTab === 'account' && (
              <>
                <SettingCard title="Account" desc="Profile information used across LifeOS.">
                  <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First name">
                      <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass()} />
                    </Field>
                    <Field label="Last name">
                      <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass()} />
                    </Field>
                    <Field label="Email">
                      <input value={email} readOnly className={`${inputClass()} cursor-not-allowed opacity-70`} />
                    </Field>
                    <Field label="City">
                      <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass()} />
                    </Field>
                    <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
                      <button type="submit" className="bg-primary text-on-primary px-5 py-2.5 rounded-lg text-[14px] font-medium hover:opacity-90">Save profile</button>
                      <button type="button" onClick={logout} className="bg-surface-variant text-on-surface px-5 py-2.5 rounded-lg text-[14px] font-medium hover:bg-outline-variant">Log out</button>
                    </div>
                  </form>
                </SettingCard>

                <SettingCard title="Language & Region">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Language">
                      <select value={language} onChange={(e) => setLanguage(e.target.value as 'ru' | 'kz' | 'en')} className={inputClass()}>
                        <option value="en">English</option>
                        <option value="ru">Russian</option>
                        <option value="kz">Kazakh</option>
                      </select>
                    </Field>
                    <Field label="Currency">
                      <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass()}>
                        <option value="USD">USD</option>
                        <option value="KZT">KZT</option>
                        <option value="EUR">EUR</option>
                        <option value="RUB">RUB</option>
                      </select>
                    </Field>
                    <Field label="Time zone">
                      <select
                        value={timeZone}
                        onChange={(e) => {
                          setTimeZone(e.target.value);
                          addToast('Time zone saved');
                        }}
                        className={inputClass()}
                      >
                        {timeZoneOptions.map((zone) => (
                          <option key={zone} value={zone}>{formatTimeZoneLabel(zone)}</option>
                        ))}
                      </select>
                    </Field>
                    <div className="sm:col-span-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-[12px] text-on-surface-variant">
                      Browser detected {browserTimeZone()}. AI answers and learning auto-scheduling use the selected time zone.
                    </div>
                  </div>
                </SettingCard>
              </>
            )}

            {activeTab === 'appearance' && (
              <>
                <SettingCard title="Appearance" desc="These settings are saved locally on this device.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Theme">
                      <select value={themeMode} onChange={(e) => setThemeMode(e.target.value)} className={inputClass()}>
                        <option value="system">System</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </Field>
                    <Field label="Default start page">
                      <select value={defaultView} onChange={(e) => { setDefaultView(e.target.value); addToast('Default start page saved'); }} className={inputClass()}>
                        {viewOptions.map((view) => <option key={view.id} value={view.id}>{view.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Density">
                      <select value={density} onChange={(e) => setDensity(e.target.value)} className={inputClass()}>
                        <option value="comfortable">Comfortable</option>
                        <option value="compact">Compact</option>
                      </select>
                    </Field>
                    <Field label="Time format">
                      <select value={timeFormat} onChange={(e) => setTimeFormat(e.target.value)} className={inputClass()}>
                        <option value="24h">24-hour</option>
                        <option value="12h">12-hour</option>
                      </select>
                    </Field>
                    <Field label="Date format">
                      <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className={inputClass()}>
                        <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                        <option value="dd.mm.yyyy">DD.MM.YYYY</option>
                        <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                      </select>
                    </Field>
                  </div>
                  <button onClick={resetUiSettings} className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-primary">
                    <RotateCcw className="w-4 h-4" />
                    Reset appearance defaults
                  </button>
                </SettingCard>
              </>
            )}

            {activeTab === 'calendar' && (
              <SettingCard title="Calendar & Scheduling" desc="Defaults for calendar views and AI learning scheduling.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Default view">
                    <select value={calendarView} onChange={(e) => setCalendarView(e.target.value)} className={inputClass()}>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="day">Day</option>
                    </select>
                  </Field>
                  <Field label="Week starts on">
                    <select value={weekStartsOn} onChange={(e) => setWeekStartsOn(e.target.value)} className={inputClass()}>
                      <option value="monday">Monday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </Field>
                  <Field label="Working day starts">
                    <input type="time" value={workingStart} onChange={(e) => setWorkingStart(e.target.value)} className={inputClass()} />
                  </Field>
                  <Field label="Working day ends">
                    <input type="time" value={workingEnd} onChange={(e) => setWorkingEnd(e.target.value)} className={inputClass()} />
                  </Field>
                  <Field label="Preferred study start">
                    <input type="time" value={studyStart} onChange={(e) => setStudyStart(e.target.value)} className={inputClass()} />
                  </Field>
                  <Field label="Preferred study end">
                    <input type="time" value={studyEnd} onChange={(e) => setStudyEnd(e.target.value)} className={inputClass()} />
                  </Field>
                  <Field label="Default event duration">
                    <select value={defaultEventDuration} onChange={(e) => setDefaultEventDuration(e.target.value)} className={inputClass()}>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                    </select>
                  </Field>
                </div>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between gap-3 bg-surface-container-low border border-outline-variant rounded-lg p-3">
                    <span className="text-[13px] font-medium text-on-surface">Show weekends</span>
                    <Toggle checked={showWeekends === 'true'} onChange={(checked) => setShowWeekends(String(checked))} />
                  </label>
                  <label className="flex items-center justify-between gap-3 bg-surface-container-low border border-outline-variant rounded-lg p-3">
                    <span className="text-[13px] font-medium text-on-surface">Show AI learning sessions</span>
                    <Toggle checked={showAiSessions === 'true'} onChange={(checked) => setShowAiSessions(String(checked))} />
                  </label>
                </div>
              </SettingCard>
            )}

            {activeTab === 'finance' && (
              <SettingCard title="Finance Defaults" desc="Budget and export defaults for the finance cabinet.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Monthly budget">
                    <input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} placeholder="0" className={inputClass()} />
                  </Field>
                  <Field label="Default expense category">
                    <select value={defaultExpenseCategory} onChange={(e) => setDefaultExpenseCategory(e.target.value)} className={inputClass()}>
                      <option>Dining</option>
                      <option>Groceries</option>
                      <option>Transport</option>
                      <option>Personal</option>
                      <option>Entertainment</option>
                      <option>Housing</option>
                      <option>Health</option>
                    </select>
                  </Field>
                  <Field label="Dining budget">
                    <input type="number" value={diningBudget} onChange={(e) => setDiningBudget(e.target.value)} placeholder="0" className={inputClass()} />
                  </Field>
                  <Field label="Transport budget">
                    <input type="number" value={transportBudget} onChange={(e) => setTransportBudget(e.target.value)} placeholder="0" className={inputClass()} />
                  </Field>
                  <Field label="Default export format">
                    <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className={inputClass()}>
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </Field>
                </div>
                <div className="mt-5">
                  <label className="flex items-center justify-between gap-3 bg-surface-container-low border border-outline-variant rounded-lg p-3">
                    <span className="text-[13px] font-medium text-on-surface">Show month-end forecast</span>
                    <Toggle checked={financeForecast === 'true'} onChange={(checked) => setFinanceForecast(String(checked))} />
                  </label>
                </div>
              </SettingCard>
            )}

            {activeTab === 'ai' && (
              <>
                <SettingCard title="AI Controls" desc="Control how AI uses LifeOS data.">
                  <div className="space-y-3">
                    <label className="flex items-center justify-between gap-3 bg-surface-container-low border border-outline-variant rounded-lg p-3">
                      <span>
                        <span className="block text-[13px] font-medium text-on-surface">Enable AI context</span>
                        <span className="block text-[12px] text-on-surface-variant">If off, AI requests are sent without LifeOS data context.</span>
                      </span>
                      <Toggle
                        checked={hasAiContextEnabled}
                        onChange={(checked) => {
                          const updates = Object.fromEntries(Object.keys(aiDataAccess).map((key) => [key, checked]));
                          setAiDataAccess(updates as any);
                        }}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 bg-surface-container-low border border-outline-variant rounded-lg p-3">
                      <span className="text-[13px] font-medium text-on-surface">Require confirmation before AI creates records</span>
                      <Toggle checked={aiConfirmation === 'true'} onChange={(checked) => setAiConfirmation(String(checked))} />
                    </label>
                    <label className="flex items-center justify-between gap-3 bg-surface-container-low border border-outline-variant rounded-lg p-3">
                      <span className="text-[13px] font-medium text-on-surface">Mask finance amounts in privacy mode</span>
                      <Toggle checked={maskFinance === 'true'} onChange={(checked) => setMaskFinance(String(checked))} />
                    </label>
                    <Field label="AI tone">
                      <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className={inputClass()}>
                        <option value="concise">Concise</option>
                        <option value="detailed">Detailed</option>
                        <option value="coach">Coach</option>
                      </select>
                    </Field>
                  </div>
                </SettingCard>

                <SettingCard title="AI Data Access">
                  <div className="space-y-3">
                    {aiAccessGroups.map((item) => (
                      <label key={item.key} className="flex items-start justify-between gap-4 p-4 bg-surface-container-low border border-outline-variant rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
                        <span>
                          <span className="block font-medium text-on-surface text-[14px]">{item.title}</span>
                          <span className="block text-[13px] text-on-surface-variant mt-0.5">{item.desc}</span>
                        </span>
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded border-outline-variant accent-primary shrink-0"
                          checked={aiDataAccess[item.key]}
                          onChange={(event) => setAiDataAccess({ [item.key]: event.target.checked } as any)}
                        />
                      </label>
                    ))}
                  </div>
                </SettingCard>

                <SettingCard title="AI Data Preview" desc="Counts of records that can be summarized for AI when enabled.">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(aiPreview).map(([key, count]) => (
                      <div key={key} className="bg-surface-container-low border border-outline-variant rounded-lg p-3">
                        <p className="text-[11px] font-mono uppercase text-on-surface-variant">{key}</p>
                        <p className="text-[24px] font-heading font-bold text-on-surface">{count}</p>
                      </div>
                    ))}
                  </div>
                </SettingCard>
              </>
            )}

            {activeTab === 'data' && (
              <>
                <SettingCard title="Notifications">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ['Master notifications', masterNotifications, setMasterNotifications],
                      ['Calendar reminders', calendarNotifications, setCalendarNotifications],
                      ['Learning reminders', learningNotifications, setLearningNotifications],
                      ['Budget alerts', budgetNotifications, setBudgetNotifications],
                    ].map(([label, value, setter]) => (
                      <label key={String(label)} className="flex items-center justify-between gap-3 bg-surface-container-low border border-outline-variant rounded-lg p-3">
                        <span className="text-[13px] font-medium text-on-surface">{String(label)}</span>
                        <Toggle checked={value === 'true'} onChange={(checked) => (setter as (next: string) => void)(String(checked))} />
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <Field label="Quiet hours start">
                      <input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} className={inputClass()} />
                    </Field>
                    <Field label="Quiet hours end">
                      <input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} className={inputClass()} />
                    </Field>
                  </div>
                </SettingCard>

                <SettingCard title="Data & Export" desc="Download a JSON backup of records currently loaded in the app.">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3"><p className="text-[11px] font-mono text-on-surface-variant">Goals</p><p className="text-xl font-bold">{store.goals.length}</p></div>
                    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3"><p className="text-[11px] font-mono text-on-surface-variant">Calendar</p><p className="text-xl font-bold">{store.calendarEvents.length}</p></div>
                    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3"><p className="text-[11px] font-mono text-on-surface-variant">Finance</p><p className="text-xl font-bold">{store.finances.length}</p></div>
                    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3"><p className="text-[11px] font-mono text-on-surface-variant">Notes</p><p className="text-xl font-bold">{store.notes.length}</p></div>
                  </div>
                  <button onClick={handleExportData} className="inline-flex items-center gap-2 bg-surface-variant text-on-surface px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-outline-variant">
                    <Download className="w-4 h-4" />
                    Download JSON backup
                  </button>
                </SettingCard>

                <SettingCard title="Danger Zone" desc="Permanently delete your account and all records stored on the backend.">
                  <button onClick={handleDeleteAccount} className="inline-flex items-center gap-2 bg-error text-on-error px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90">
                    <Trash2 className="w-4 h-4" />
                    Delete account and data
                  </button>
                </SettingCard>
              </>
            )}

            {activeTab === 'diagnostics' && (
              <SettingCard title="Diagnostics" desc="Useful when debugging local or production issues.">
                <div className="space-y-3 text-[13px]">
                  <div className="flex justify-between gap-4 border-b border-outline-variant pb-2"><span className="text-on-surface-variant">API base</span><span className="font-mono text-on-surface">{apiBase}</span></div>
                  <div className="flex justify-between gap-4 border-b border-outline-variant pb-2"><span className="text-on-surface-variant">Environment</span><span className="font-mono text-on-surface">{import.meta.env.MODE}</span></div>
                  <div className="flex justify-between gap-4 border-b border-outline-variant pb-2"><span className="text-on-surface-variant">Theme</span><span className="font-mono text-on-surface">{themeMode}</span></div>
                  <div className="flex justify-between gap-4 border-b border-outline-variant pb-2"><span className="text-on-surface-variant">Time zone</span><span className="font-mono text-on-surface">{timeZone}</span></div>
                  <div className="flex justify-between gap-4 border-b border-outline-variant pb-2"><span className="text-on-surface-variant">Default view</span><span className="font-mono text-on-surface">{defaultView}</span></div>
                  <div className="flex justify-between gap-4 border-b border-outline-variant pb-2"><span className="text-on-surface-variant">Browser notifications</span><span className="font-mono text-on-surface">{'Notification' in window ? Notification.permission : 'unsupported'}</span></div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={handleCopyDiagnostics} className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90">
                    <Eye className="w-4 h-4" />
                    Copy diagnostics
                  </button>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }))} className="inline-flex items-center gap-2 bg-surface-variant text-on-surface px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-outline-variant">
                    <LayoutDashboard className="w-4 h-4" />
                    Open dashboard
                  </button>
                </div>
              </SettingCard>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

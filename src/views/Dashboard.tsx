import React, { useMemo, useState } from 'react';
import { format, isSameDay, subDays } from 'date-fns';
import { Bot, CalendarDays, Check, ChevronRight, HeartPulse, NotebookText, Repeat, Target, Wallet } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useStore } from '../store';

function currencyFormatter(currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency });
}

function toDate(value: unknown) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.valueOf()) ? new Date() : date;
}

function isIncome(tx: any) {
  return tx.type === 'income' || Number(tx.amount || 0) < 0;
}

export function Dashboard() {
  const {
    goals,
    habits,
    finances,
    healthLogs,
    calendarEvents,
    notes,
    updateEntity,
    addEntity,
    addActivity,
    addToast,
    currency,
  } = useStore();
  const money = currencyFormatter(currency);
  const [focusId, setFocusId] = useState(() => localStorage.getItem('lifeos-daily-focus') || goals.find((goal: any) => Number(goal.progress || 0) < 100)?.id || '');

  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];
  const focusGoal = goals.find((goal: any) => goal.id === focusId) || goals.find((goal: any) => Number(goal.progress || 0) < 100) || goals[0];
  const activeGoals = goals.filter((goal: any) => Number(goal.progress || 0) < 100);
  const todayEvents = calendarEvents
    .filter((event: any) => isSameDay(toDate(event.start), today))
    .sort((a: any, b: any) => toDate(a.start).getTime() - toDate(b.start).getTime());
  const todayHabits = habits.slice(0, 6);
  const completedHabits = habits.filter((habit: any) => (habit.done || []).includes(todayKey) || habit.completedToday).length;
  const latestHealth = [...healthLogs].sort((a: any, b: any) => toDate(b.date).getTime() - toDate(a.date).getTime())[0];
  const monthSpend = finances
    .filter((tx: any) => !isIncome(tx) && toDate(tx.date).getMonth() === today.getMonth() && toDate(tx.date).getFullYear() === today.getFullYear())
    .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const weeklyReview = useMemo(() => {
    const since = subDays(today, 6);
    const doneHabitMarks = habits.reduce((sum: number, habit: any) => {
      return sum + (habit.done || []).filter((date: string) => toDate(date) >= since).length;
    }, 0);
    const completedGoalCount = goals.filter((goal: any) => Number(goal.progress || 0) >= 100).length;
    const newNotes = notes.filter((note: any) => toDate(note.timestamp || note.date) >= since).length;
    const eventsCount = calendarEvents.filter((event: any) => toDate(event.start) >= since).length;
    const blocker = activeGoals.find((goal: any) => Number(goal.progress || 0) < 30)?.title || habits.find((habit: any) => !(habit.done || []).includes(todayKey))?.title || 'No clear blocker yet';
    return { doneHabitMarks, completedGoalCount, newNotes, eventsCount, blocker };
  }, [activeGoals, calendarEvents, goals, habits, notes, todayKey]);

  const setFocus = (id: string) => {
    setFocusId(id);
    localStorage.setItem('lifeos-daily-focus', id);
  };

  const toggleHabit = async (habit: any) => {
    const done = (habit.done || []).includes(todayKey) || habit.completedToday;
    const nextDone = done ? (habit.done || []).filter((date: string) => date !== todayKey) : [...new Set([...(habit.done || []), todayKey])];
    await updateEntity('habits', habit.id, {
      completedToday: !done,
      done: nextDone,
      streak: !done ? Number(habit.streak || 0) + 1 : Math.max(0, Number(habit.streak || 0) - 1),
      bestStreak: !done ? Math.max(Number(habit.bestStreak || 0), Number(habit.streak || 0) + 1) : Number(habit.bestStreak || 0),
    });
    if (!done) addActivity(`Completed habit: ${habit.title}`, 'Today');
  };

  const createStarterHabit = async () => {
    const title = focusGoal ? `Work on ${focusGoal.title}` : 'Plan tomorrow';
    await addEntity('habits', {
      id: Math.random().toString(36).slice(2, 10),
      title,
      category: focusGoal?.category || 'Focus',
      linkedGoalId: focusGoal?.id,
      streak: 0,
      bestStreak: 0,
      completedToday: false,
      done: [],
    });
    addToast('Starter habit created');
  };

  const askAi = (prompt: string) => {
    localStorage.setItem('lifeos-ai-pending-prompt', prompt);
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'ai' }));
  };

  const aiActions = [
    { label: 'Plan my day', prompt: 'Plan my day using my goals, habits, calendar, finance, health, notes, and learning data. Give me 3 priorities and a simple schedule.' },
    { label: 'Review my week', prompt: 'Review my last week. Tell me what worked, what slipped, and what to change next week.' },
    { label: 'Find blocker', prompt: 'Find the biggest blocker for my main goal and suggest the next concrete action.' },
    { label: 'Next habit', prompt: 'Suggest one small habit that would best support my current goals.' },
    { label: 'Make calendar plan', prompt: 'Suggest where I should schedule focused work for my main goal.' },
    { label: 'Summarize notes', prompt: 'Summarize my recent notes and extract useful actions.' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background flex flex-col h-full relative pb-24 lg:pb-0">
      <TopBar title="Today" />

      <div className="p-4 lg:p-8 max-w-[1280px] mx-auto w-full flex-1 flex flex-col gap-6">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="font-mono text-[12px] text-on-surface-variant uppercase tracking-wider">{format(today, 'EEEE, MMM d')}</p>
            <h1 className="text-[32px] lg:text-[44px] font-heading font-extrabold text-on-surface leading-tight">Today</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {aiActions.slice(0, 3).map((action, index) => (
              <button key={action.label} onClick={() => askAi(action.prompt)} className={`${index === 0 ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface border border-outline-variant hover:bg-surface-container-low'} px-3 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2`}>
                <Bot className="w-4 h-4" />
                {action.label}
              </button>
            ))}
          </div>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-6">
            <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[18px] font-heading font-bold text-on-surface">Main Focus</h2>
                  <p className="text-[13px] text-on-surface-variant mt-1">Pick the goal that should shape your day.</p>
                </div>
                {activeGoals.length > 0 && (
                  <label className="flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
                    Focus goal
                    <select value={focusGoal?.id || ''} onChange={(event) => setFocus(event.target.value)} className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] font-sans normal-case tracking-normal text-on-surface max-w-[240px]">
                      {activeGoals.map((goal: any) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
                    </select>
                  </label>
                )}
              </div>
              {focusGoal ? (
                <div className="mt-5 p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[20px] font-heading font-bold text-on-surface truncate">{focusGoal.title}</p>
                      <p className="text-[13px] text-on-surface-variant mt-1">{focusGoal.deadline ? `Deadline: ${focusGoal.deadline}` : 'No deadline'}</p>
                    </div>
                    <div className="text-[28px] font-heading font-extrabold text-primary">{Number(focusGoal.progress || 0)}%</div>
                  </div>
                  <div className="h-2 bg-surface-variant rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(focusGoal.progress || 0)))}%` }} />
                  </div>
                </div>
              ) : (
                <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'goals' }))} className="mt-5 w-full border border-dashed border-outline-variant rounded-xl p-6 text-[14px] text-on-surface-variant hover:bg-surface-container-low">
                  Create your first goal
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-heading font-bold text-on-surface flex items-center gap-2"><Repeat className="w-5 h-5 text-primary" /> Habits</h2>
                  <span className="text-[13px] text-on-surface-variant">{completedHabits}/{habits.length}</span>
                </div>
                <div className="space-y-2">
                  {todayHabits.length ? todayHabits.map((habit: any) => {
                    const done = (habit.done || []).includes(todayKey) || habit.completedToday;
                    return (
                      <button key={habit.id} onClick={() => toggleHabit(habit)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-outline-variant bg-surface-container-low text-left hover:border-primary/50">
                        <span className={`w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 ${done ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant'}`}>
                          {done && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className={`text-[14px] ${done ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{habit.title}</span>
                      </button>
                    );
                  }) : (
                    <button onClick={createStarterHabit} className="w-full border border-dashed border-outline-variant rounded-lg p-5 text-[14px] text-on-surface-variant hover:bg-surface-container-low">Create a starter habit</button>
                  )}
                </div>
              </div>

              <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-heading font-bold text-on-surface flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Schedule</h2>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'calendar' }))} className="text-[12px] text-primary font-semibold">Open</button>
                </div>
                <div className="space-y-2">
                  {todayEvents.length ? todayEvents.slice(0, 5).map((event: any) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 bg-surface-container-low border border-outline-variant rounded-lg">
                      <span className="font-mono text-[12px] text-primary w-12 shrink-0">{format(toDate(event.start), 'HH:mm')}</span>
                      <div>
                        <p className="text-[14px] text-on-surface font-medium">{event.title}</p>
                        {event.description && <p className="text-[12px] text-on-surface-variant mt-0.5">{event.description}</p>}
                      </div>
                    </div>
                  )) : (
                    <p className="text-[14px] text-on-surface-variant p-5 border border-dashed border-outline-variant rounded-lg">No events today.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="xl:col-span-4 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Metric icon={Target} label="Active Goals" value={String(activeGoals.length)} />
              <Metric icon={Wallet} label="Month Spend" value={money.format(monthSpend)} />
              <Metric icon={HeartPulse} label="Sleep" value={latestHealth?.sleepHours ? `${latestHealth.sleepHours}h` : '—'} />
              <Metric icon={NotebookText} label="Notes" value={String(notes.length)} />
            </div>

            <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
              <h2 className="text-[18px] font-heading font-bold text-on-surface mb-4">Weekly Review</h2>
              <div className="space-y-3 text-[14px]">
                <ReviewLine label="Habit completions" value={weeklyReview.doneHabitMarks} />
                <ReviewLine label="Completed goals" value={weeklyReview.completedGoalCount} />
                <ReviewLine label="Calendar events" value={weeklyReview.eventsCount} />
                <ReviewLine label="New notes" value={weeklyReview.newNotes} />
              </div>
              <div className="mt-4 p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                <p className="text-[12px] font-mono text-on-surface-variant uppercase">Likely blocker</p>
                <p className="text-[14px] text-on-surface mt-1">{weeklyReview.blocker}</p>
              </div>
              <button onClick={() => askAi(aiActions[1].prompt)} className="mt-4 w-full bg-primary text-on-primary rounded-lg py-2 text-[13px] font-semibold flex items-center justify-center gap-2">
                <Bot className="w-4 h-4" /> Review with AI
              </button>
            </div>

            <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
              <h2 className="text-[18px] font-heading font-bold text-on-surface mb-4">AI Actions</h2>
              <div className="space-y-2">
                {aiActions.slice(3).map((action) => (
                  <button key={action.label} onClick={() => askAi(action.prompt)} className="w-full flex items-center justify-between p-3 rounded-lg border border-outline-variant bg-surface-container-low text-left hover:border-primary/50">
                    <span className="text-[14px] text-on-surface">{action.label}</span>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-on-surface-variant mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <div className="text-[22px] font-heading font-bold text-on-surface truncate">{value}</div>
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-mono text-on-surface">{value}</span>
    </div>
  );
}

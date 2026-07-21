import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, HeartPulse, Lightbulb, NotebookText, Plus, Target, Wallet, X } from 'lucide-react';
import { useStore } from '../store';

type CaptureType = 'goals' | 'habits' | 'finances' | 'calendarEvents' | 'healthLogs' | 'notes';

const captureOptions: { id: CaptureType; label: string; icon: React.ElementType }[] = [
  { id: 'notes', label: 'Note', icon: NotebookText },
  { id: 'goals', label: 'Goal', icon: Target },
  { id: 'habits', label: 'Habit', icon: Lightbulb },
  { id: 'finances', label: 'Expense', icon: Wallet },
  { id: 'calendarEvents', label: 'Event', icon: CalendarDays },
  { id: 'healthLogs', label: 'Health', icon: HeartPulse },
];

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function detectType(text: string): CaptureType {
  const value = text.toLowerCase();
  if (/(потрат|купил|spent|expense|₸|\$|руб|kzt|usd|\d+\s*(тг|тенге))/.test(value)) return 'finances';
  if (/(завтра|сегодня|созвон|встреч|meeting|call|\d{1,2}[:.]\d{2})/.test(value)) return 'calendarEvents';
  if (/(вес|сон|sleep|water|вода|пробеж|run|бег|болит|самочув)/.test(value)) return 'healthLogs';
  if (/(цель|goal|хочу|добиться)/.test(value)) return 'goals';
  if (/(привыч|habit|каждый день|ежедневно)/.test(value)) return 'habits';
  return 'notes';
}

function stripPrefix(text: string) {
  return text.replace(/^(идея|заметка|note|цель|goal|привычка|habit)\s*[:—-]?\s*/i, '').trim();
}

function parseAmount(text: string) {
  const match = text.match(/(\d+(?:[.,]\d{1,2})?)/);
  return match ? Number(match[1].replace(',', '.')) : 0;
}

function parseEventDate(text: string) {
  const now = new Date();
  const lower = text.toLowerCase();
  const date = new Date(now);
  if (lower.includes('завтра') || lower.includes('tomorrow')) date.setDate(date.getDate() + 1);
  const timeMatch = text.match(/(\d{1,2})[:.](\d{2})/);
  const hour = timeMatch ? Number(timeMatch[1]) : 10;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  date.setHours(hour, minute, 0, 0);
  const end = new Date(date.getTime() + 60 * 60 * 1000);
  return { start: date.toISOString(), end: end.toISOString() };
}

export function QuickCapture() {
  const { addEntity, addActivity, addToast } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const detectedType = useMemo(() => detectType(text), [text]);
  const [type, setType] = useState<CaptureType>('notes');
  const activeType = text.trim() ? type : detectedType;

  useEffect(() => {
    if (text.trim()) setType(detectedType);
  }, [detectedType, text]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (!isTyping && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setIsOpen(true);
      }
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = stripPrefix(text);
    if (!value) return;
    const id = Math.random().toString(36).slice(2, 10);
    try {
      if (activeType === 'goals') {
        await addEntity('goals', { id, title: value, progress: 0, deadline: todayDate(), category: 'General', subgoals: [] });
      } else if (activeType === 'habits') {
        await addEntity('habits', { id, title: value, category: 'General', streak: 0, bestStreak: 0, completedToday: false, done: [] });
      } else if (activeType === 'finances') {
        const amount = parseAmount(value);
        if (!amount) {
          addToast('Add an amount for the expense.', 'error');
          return;
        }
        await addEntity('finances', { id, name: value, category: 'Quick Capture', amount, date: new Date().toISOString(), type: 'expense' });
      } else if (activeType === 'calendarEvents') {
        const times = parseEventDate(value);
        await addEntity('calendarEvents', { id, title: value, type: 'other', description: '', ...times });
      } else if (activeType === 'healthLogs') {
        await addEntity('healthLogs', { id, date: todayDate(), journal: value });
      } else {
        await addEntity('notes', { id, title: value.slice(0, 60), content: `<p>${value}</p>`, tags: ['quick'], timestamp: new Date().toISOString() });
      }
      addActivity(`Captured ${captureOptions.find((item) => item.id === activeType)?.label || 'item'}: ${value}`, 'Quick Capture');
      setText('');
      setIsOpen(false);
    } catch {
      // Store already shows a toast.
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="Quick Capture (N)"
        className="fixed bottom-24 lg:bottom-6 left-4 lg:left-1/2 lg:-translate-x-1/2 z-40 bg-primary text-on-primary rounded-full shadow-lg px-4 py-3 text-[13px] font-semibold flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Quick Capture
      </button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-24 lg:bottom-6 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 z-50 lg:w-[760px]">
      <form onSubmit={save} className="bg-surface border border-outline-variant shadow-xl rounded-xl p-3">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Capture anything: spent 2500 food, tomorrow 15:00 call, note idea..."
            className="min-w-0 flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-3 text-[16px] lg:text-[14px] text-on-surface outline-none focus:border-primary"
          />
          <button type="button" aria-label="Close" onClick={() => setIsOpen(false)} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {captureOptions.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setType(id)}
              className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 ${
                activeType === id ? 'bg-primary text-on-primary border-primary' : 'bg-surface text-on-surface border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
          <button type="submit" disabled={!text.trim()} className="ml-auto bg-primary text-on-primary px-4 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-50">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

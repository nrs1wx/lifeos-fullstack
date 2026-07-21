import React, { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, format, isSameDay, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, GraduationCap, Plus, Trash2, X } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useStore } from '../store';

type EventType = 'work' | 'personal' | 'health' | 'other' | 'learning';
type CalendarEvent = { id: string; title: string; start: string; end: string; type: EventType; category?: string; description?: string; endsNextDay?: boolean; learning_goal?: string | null; learning_goal_subject?: string | null; is_recurring?: boolean };
type Draft = { id?: string; title: string; date: string; startTime: string; endTime: string; type: EventType; category?: string; description: string; endsNextDay: boolean; learning_goal?: string | null; learning_goal_subject?: string | null; is_recurring?: boolean };
type CalendarView = 'month' | 'week' | 'day';

const HOUR_START = 7;
const HOUR_END = 22;
const HOUR_HEIGHT = 72;

const EVENT_TYPES: EventType[] = ['work', 'personal', 'health', 'learning', 'other'];

const eventStyle: Record<EventType, { card: string; accentBar: string; dot: string; ring: string; label: string }> = {
  work: {
    card: 'bg-cal-work-bg text-cal-work-text',
    accentBar: 'bg-cal-work-accent',
    dot: 'bg-cal-work-accent',
    ring: 'ring-cal-work-accent',
    label: 'Work',
  },
  personal: {
    card: 'bg-cal-personal-bg text-cal-personal-text',
    accentBar: 'bg-cal-personal-accent',
    dot: 'bg-cal-personal-accent',
    ring: 'ring-cal-personal-accent',
    label: 'Personal',
  },
  health: {
    card: 'bg-cal-health-bg text-cal-health-text',
    accentBar: 'bg-cal-health-accent',
    dot: 'bg-cal-health-accent',
    ring: 'ring-cal-health-accent',
    label: 'Health',
  },
  other: {
    card: 'bg-cal-other-bg text-cal-other-text',
    accentBar: 'bg-cal-other-accent',
    dot: 'bg-cal-other-accent',
    ring: 'ring-cal-other-accent',
    label: 'Other',
  },
  learning: {
    card: 'bg-cal-learning-bg text-cal-learning-text',
    accentBar: 'bg-cal-learning-accent',
    dot: 'bg-cal-learning-accent',
    ring: 'ring-cal-learning-accent',
    label: 'Learning',
  },
};

const localDate = (date: Date) => format(date, 'yyyy-MM-dd');
const eventDate = (date: string) => parseISO(date);
const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');
const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, index) => HOUR_START + index);

function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function fromDate(date: Date, event?: CalendarEvent): Draft {
  const start = event ? eventDate(event.start) : date;
  const end = event ? eventDate(event.end) : new Date(date.getTime() + 60 * 60 * 1000);
  return {
    id: event?.id,
    title: event?.title ?? '',
    date: localDate(start),
    startTime: format(start, 'HH:mm'),
    endTime: format(end, 'HH:mm'),
    type: event?.type ?? 'work',
    category: event?.category,
    description: event?.description ?? '',
    endsNextDay: event ? !isSameDay(start, end) : Boolean(event?.endsNextDay),
    learning_goal: event?.learning_goal ?? null,
    learning_goal_subject: event?.learning_goal_subject ?? null,
    is_recurring: event?.is_recurring,
  };
}

function toUtc(draft: Draft) {
  const start = new Date(`${draft.date}T${draft.startTime}`);
  const endDate = draft.endsNextDay ? localDate(addDays(start, 1)) : draft.date;
  const end = new Date(`${endDate}T${draft.endTime}`);
  return { start: start.toISOString(), end: end.toISOString() };
}

function eventsForDay(events: CalendarEvent[], day: Date) {
  return events
    .filter((event) => isSameDay(eventDate(event.start), day))
    .sort((a, b) => eventDate(a.start).getTime() - eventDate(b.start).getTime());
}

function rangeLabel(days: Date[], selectedDate: Date, view: CalendarView) {
  if (view === 'month') return format(selectedDate, 'MMMM yyyy');
  if (view === 'day') return format(selectedDate, 'd MMMM yyyy');
  const first = days[0] ?? selectedDate;
  const last = days[days.length - 1] ?? selectedDate;
  return `${format(first, 'MMM d')} - ${format(last, 'MMM d')}`;
}

export function Calendar() {
  const { calendarEvents, addEntity, updateEntity, deleteEntity, addToast } = useStore();
  const events = calendarEvents as CalendarEvent[];
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmConflict, setConfirmConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(new Set(EVENT_TYPES));

  const days = useMemo(() => {
    if (view === 'day') return [selectedDate];
    if (view === 'week') return Array.from({ length: 4 }, (_, i) => addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i));
    const first = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [selectedDate, view]);

  const typeCounts = useMemo(() => {
    const counts: Record<EventType, number> = { work: 0, personal: 0, health: 0, learning: 0, other: 0 };
    days.forEach((day) => {
      eventsForDay(events, day).forEach((event) => {
        counts[event.type] += 1;
      });
    });
    return counts;
  }, [events, days]);

  const visibleEvents = useMemo(() => events.filter((event) => activeTypes.has(event.type)), [events, activeTypes]);

  const toggleType = (type: EventType) => {
    setActiveTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const resetTypes = () => setActiveTypes(new Set(EVENT_TYPES));

  const shift = (direction: number) => {
    setSelectedDate((date) => (view === 'month' ? addMonths(date, direction) : addDays(date, direction * (view === 'week' ? 7 : 1))));
  };

  const conflicts = (candidate: Draft) => {
    const range = toUtc(candidate);
    const start = new Date(range.start).valueOf();
    const end = new Date(range.end).valueOf();
    return events.filter((event) => event.id !== candidate.id && new Date(event.start).valueOf() < end && new Date(event.end).valueOf() > start);
  };

  const save = async (force = false) => {
    if (!draft) return;
    const times = toUtc(draft);
    setError('');
    if (!draft.title.trim()) return setError('Add an event title.');
    if (new Date(times.end) <= new Date(times.start)) return setError('End time must be later than start time.');
    if (!force && conflicts(draft).length) return setConfirmConflict(true);
    setSaving(true);
    setError('');
    try {
      const entity = { ...draft, ...times, id: draft.id, title: draft.title.trim() };
      delete (entity as Partial<Draft>).date;
      delete (entity as Partial<Draft>).startTime;
      delete (entity as Partial<Draft>).endTime;
      if (draft.id) await updateEntity('calendarEvents', draft.id, entity);
      else await addEntity('calendarEvents', entity);
      setDraft(null);
      setConfirmConflict(false);
    } catch {
      /* toast is shown by the store */
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id || !window.confirm(`Delete event "${draft.title}"?`)) return;
    setDeleting(true);
    try {
      await deleteEntity('calendarEvents', draft.id);
      setDraft(null);
    } finally {
      setDeleting(false);
    }
  };

  const openDate = (date: Date) => {
    setSelectedDate(date);
    setDraft(fromDate(date));
    setError('');
  };

  const openEvent = (event: CalendarEvent) => {
    setDraft(fromDate(eventDate(event.start), event));
    setError('');
  };

  const unlinkLearningEvent = async () => {
    if (!draft?.id) return;
    await updateEntity('calendarEvents', draft.id, {
      learning_goal: null,
      learning_goal_subject: null,
      is_recurring: false,
    });
    setDraft((current) => current ? { ...current, learning_goal: null, learning_goal_subject: null, is_recurring: false } : current);
    addToast('Event unlinked from learning goal', 'info');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background pb-16 lg:pb-0">
      <TopBar showMobileTitle={false} />

      <div className="flex flex-1 min-h-0 flex-col px-3 py-3 lg:px-8 lg:py-5">
        <CalendarToolbar
          view={view}
          days={days}
          selectedDate={selectedDate}
          onShift={shift}
          onToday={() => setSelectedDate(new Date())}
          onView={setView}
          onNew={() => openDate(selectedDate)}
          typeCounts={typeCounts}
          activeTypes={activeTypes}
          onToggleType={toggleType}
          onResetTypes={resetTypes}
        />

        <MobileCalendar
          view={view}
          days={days}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          events={visibleEvents}
          onOpen={openDate}
          onEdit={openEvent}
        />

        <div className="hidden min-h-0 flex-1 lg:block">
          {view === 'month' ? (
            <MonthBoard days={days} selectedDate={selectedDate} events={visibleEvents} onOpen={openDate} onEdit={openEvent} />
          ) : (
            <TimeBoard days={days} selectedDate={selectedDate} events={visibleEvents} onOpen={openDate} onEdit={openEvent} />
          )}
        </div>
      </div>

      <button
        aria-label="New calendar event"
        onClick={() => openDate(selectedDate)}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl shadow-primary/30 transition-transform hover:scale-105 hover:opacity-90 lg:bottom-8 lg:right-10 lg:h-16 lg:w-16"
      >
        <Plus className="h-8 w-8" />
      </button>

      {draft && (
        <EventModal
          draft={draft}
          setDraft={setDraft}
          error={error}
          conflicts={conflicts(draft)}
          saving={saving}
          deleting={deleting}
          onClose={() => {
            setDraft(null);
            setConfirmConflict(false);
          }}
          onSave={() => save()}
          onDelete={remove}
          onUnlink={unlinkLearningEvent}
        />
      )}

      {confirmConflict && draft && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-w-md rounded-3xl border border-outline-variant/60 bg-surface p-6 shadow-2xl">
            <h2 className="font-heading text-lg font-extrabold text-on-surface">Time conflict</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              This time overlaps with "{conflicts(draft)[0]?.title}", {format(eventDate(conflicts(draft)[0]?.start), 'HH:mm')}–{format(eventDate(conflicts(draft)[0]?.end), 'HH:mm')}. Save anyway?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmConflict(false)} className="rounded-full px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-low">Edit time</button>
              <button onClick={() => save(true)} className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary shadow-sm shadow-primary/30">Save anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ToolbarProps = {
  view: CalendarView;
  days: Date[];
  selectedDate: Date;
  onShift: (direction: number) => void;
  onToday: () => void;
  onView: (view: CalendarView) => void;
  onNew: () => void;
  typeCounts: Record<EventType, number>;
  activeTypes: Set<EventType>;
  onToggleType: (type: EventType) => void;
  onResetTypes: () => void;
};

function CalendarToolbar({ view, days, selectedDate, onShift, onToday, onView, onNew, typeCounts, activeTypes, onToggleType, onResetTypes }: ToolbarProps) {
  const totalVisible = EVENT_TYPES.reduce((sum, type) => sum + typeCounts[type], 0);
  const allActive = activeTypes.size === EVENT_TYPES.length;

  return (
    <header className="mb-4 flex flex-col gap-4 rounded-2xl border border-outline-variant/60 bg-surface px-4 py-4 shadow-sm lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-1">
          <button aria-label="Previous" onClick={() => onShift(-1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button aria-label="Next" onClick={() => onShift(1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="min-w-0 px-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Calendar</p>
            <h1 className="truncate font-heading text-[22px] font-extrabold leading-tight text-on-surface">{rangeLabel(days, selectedDate, view)}</h1>
          </div>
          <button onClick={onToday} className="ml-1 hidden shrink-0 rounded-full border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-low sm:block">
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1 rounded-full bg-surface-container-low p-1 sm:flex-none">
            {(['week', 'month', 'day'] as const).map((item) => (
              <button
                key={item}
                onClick={() => onView(item)}
                className={`flex-1 rounded-full px-4 py-1.5 text-sm font-bold transition-colors sm:flex-none ${
                  view === item ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item === 'month' ? 'Month' : item === 'week' ? 'Week' : 'Day'}
              </button>
            ))}
          </div>
          <button onClick={onNew} className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-sm shadow-primary/30 transition-opacity hover:opacity-90">
            <Plus className="h-4 w-4" />
            Event
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/50 pt-3">
        <button
          onClick={onResetTypes}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
            allActive ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          All <span className="font-mono">{totalVisible}</span>
        </button>
        {EVENT_TYPES.map((type) => {
          const on = activeTypes.has(type);
          const style = eventStyle[type];
          return (
            <button
              key={type}
              onClick={() => onToggleType(type)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                on ? `border-transparent ${style.card}` : 'border-outline-variant text-on-surface-variant opacity-60 hover:opacity-100'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              {style.label}
              <span className="font-mono">{typeCounts[type]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

type BoardProps = { days: Date[]; selectedDate: Date; events: CalendarEvent[]; onOpen: (day: Date) => void; onEdit: (event: CalendarEvent) => void };

const TimeBoard: React.FC<BoardProps> = ({ days, selectedDate, events, onOpen, onEdit }) => {
  const now = useNow();
  return (
    <div className="h-full min-h-0 overflow-auto rounded-2xl border border-outline-variant/60 bg-surface shadow-sm custom-scrollbar">
      <div className="grid min-w-[850px]" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(190px, 1fr))` }}>
        <div className="sticky left-0 top-0 z-20 border-b border-r border-outline-variant/60 bg-surface" />

        {days.map((day) => {
          const active = isSameDay(day, selectedDate);
          const today = isSameDay(day, now);
          return (
            <button
              key={dayKey(day)}
              onClick={() => setTime(day, HOUR_START, onOpen)}
              className={`sticky top-0 z-10 border-b border-r border-outline-variant/60 bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-container-low ${active ? 'text-primary' : 'text-on-surface'}`}
            >
              <span className="block font-mono text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{format(day, 'EEE')}</span>
              <span className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full font-heading text-lg font-extrabold ${today ? 'bg-primary text-on-primary shadow-sm shadow-primary/40' : ''}`}>
                {format(day, 'd')}
              </span>
              {eventsForDay(events, day).length > 0 && (
                <span className="mt-1.5 flex gap-1">
                  {Array.from(new Set(eventsForDay(events, day).map((event) => event.type)))
                    .slice(0, 4)
                    .map((type) => (
                      <span key={type} className={`h-1.5 w-1.5 rounded-full ${eventStyle[type].dot}`} />
                    ))}
                </span>
              )}
            </button>
          );
        })}

        <div className="sticky left-0 z-10 border-r border-outline-variant/60 bg-surface">
          {hours.map((hour) => (
            <div key={hour} className="flex h-[72px] items-start justify-end border-b border-outline-variant/40 px-2 pt-1 font-mono text-[10px] font-semibold text-on-surface-variant">
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {days.map((day) => (
          <DayTimeColumn key={dayKey(day)} day={day} events={eventsForDay(events, day)} onOpen={onOpen} onEdit={onEdit} now={now} />
        ))}
      </div>
    </div>
  );
};

type DayTimeColumnProps = { day: Date; events: CalendarEvent[]; onOpen: (day: Date) => void; onEdit: (event: CalendarEvent) => void; now: Date };

const DayTimeColumn: React.FC<DayTimeColumnProps> = ({ day, events, onOpen, onEdit, now }) => {
  const totalHeight = hours.length * HOUR_HEIGHT;
  const isToday = isSameDay(day, now);
  const nowOffset = (now.getHours() + now.getMinutes() / 60 - HOUR_START) * HOUR_HEIGHT;
  const showNowLine = isToday && nowOffset >= 0 && nowOffset <= totalHeight;

  return (
    <div className="relative border-r border-outline-variant/60" style={{ height: totalHeight }}>
      {hours.map((hour) => (
        <button
          key={`${dayKey(day)}-${hour}`}
          onClick={() => setTime(day, hour, onOpen)}
          className="block h-[72px] w-full border-b border-outline-variant/40 transition-colors hover:bg-surface-container-low/60"
          aria-label={`Add event at ${formatHour(hour)} on ${format(day, 'EEEE d MMMM')}`}
        />
      ))}

      {showNowLine && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: nowOffset }}>
          <span className="-ml-[3px] h-2 w-2 shrink-0 rounded-full bg-primary shadow-sm shadow-primary/60" />
          <span className="h-px flex-1 bg-primary/70" />
        </div>
      )}

      {events.map((event, index) => {
        const start = eventDate(event.start);
        const end = eventDate(event.end);
        const rawTop = (start.getHours() + start.getMinutes() / 60 - HOUR_START) * HOUR_HEIGHT;
        const top = Math.min(Math.max(0, rawTop), totalHeight - 50);
        const duration = Math.max(0.5, (end.getTime() - start.getTime()) / 3600000);
        const height = Math.max(44, Math.min(duration * HOUR_HEIGHT, totalHeight - top - 6));
        const offset = (index % 2) * 10;
        const style = eventStyle[event.type];
        return (
          <button
            key={event.id}
            onClick={() => onEdit(event)}
            className={`absolute left-2 right-2 overflow-hidden rounded-xl py-2 pl-3 pr-2 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md ${style.card}`}
            style={{ top: top + 6 + offset, height }}
          >
            <span className={`absolute inset-y-0 left-0 w-1 ${style.accentBar}`} />
            <span className="flex items-center gap-1.5 truncate text-[13px] font-bold">
              {event.learning_goal && <GraduationCap className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{event.title}</span>
            </span>
            <span className="mt-0.5 block font-mono text-[10px] font-semibold opacity-80">
              {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
            </span>
            {height > 70 && event.description && <span className="mt-2 line-clamp-2 block text-[11px] opacity-75">{event.description}</span>}
          </button>
        );
      })}
    </div>
  );
};

const MonthBoard: React.FC<BoardProps> = ({ days, selectedDate, events, onOpen, onEdit }) => {
  const today = new Date();
  return (
    <div className="h-full min-h-0 overflow-auto rounded-2xl border border-outline-variant/60 bg-surface p-2 shadow-sm custom-scrollbar">
      <div className="grid min-w-[850px] grid-cols-7 gap-1.5">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="px-2 py-2 text-center font-mono text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{day}</div>
        ))}
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          const active = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const muted = day.getMonth() !== selectedDate.getMonth();
          return (
            <button
              key={dayKey(day)}
              onClick={() => onOpen(day)}
              className={`min-h-[128px] rounded-xl border p-2 text-left transition-colors ${
                active ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/50 hover:bg-surface-container-low'
              } ${muted ? 'opacity-40' : ''}`}
            >
              <span
                className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full font-heading text-sm font-extrabold ${
                  active ? 'bg-primary text-on-primary shadow-sm shadow-primary/40' : isToday ? 'text-primary ring-2 ring-primary' : 'text-on-surface'
                }`}
              >
                {format(day, 'd')}
              </span>
              <span className="flex flex-col gap-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const style = eventStyle[event.type];
                  return (
                    <span
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(event);
                      }}
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold ${style.card}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                      {event.learning_goal && <GraduationCap className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate">{event.title}</span>
                    </span>
                  );
                })}
                {dayEvents.length > 3 && <span className="block px-2 font-mono text-[10px] font-bold text-on-surface-variant">+{dayEvents.length - 3} more</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

function MobileCalendar({ view, days, selectedDate, setSelectedDate, events, onOpen, onEdit }: BoardProps & { view: CalendarView; setSelectedDate: React.Dispatch<React.SetStateAction<Date>> }) {
  const selectedEvents = eventsForDay(events, selectedDate);
  const visibleDays = view === 'day' ? [selectedDate] : days;

  return (
    <div className="lg:hidden flex-1 min-h-0 overflow-y-auto custom-scrollbar">
      <div className={`grid gap-2 ${view === 'day' ? 'grid-cols-1' : 'grid-cols-4'}`}>
        {visibleDays.slice(0, view === 'month' ? 28 : visibleDays.length).map((day) => {
          const active = isSameDay(day, selectedDate);
          const dayEvents = eventsForDay(events, day);
          return (
            <button
              key={dayKey(day)}
              onClick={() => setSelectedDate(day)}
              onDoubleClick={() => onOpen(day)}
              className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                active ? 'border-transparent bg-primary text-on-primary shadow-sm shadow-primary/30' : 'border-outline-variant/60 bg-surface text-on-surface'
              }`}
            >
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wide opacity-70">{format(day, view === 'day' ? 'EEE d MMM' : 'EEE')}</span>
              <span className="block font-heading text-lg font-extrabold">{format(day, 'd')}</span>
              {dayEvents.length > 0 && (
                <span className="mt-1 flex gap-1">
                  {Array.from(new Set(dayEvents.map((event) => event.type)))
                    .slice(0, 3)
                    .map((type) => (
                      <span key={type} className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-on-primary/70' : eventStyle[type].dot}`} />
                    ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section className="mt-4 rounded-2xl border border-outline-variant/60 bg-surface shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg font-extrabold text-on-surface">{format(selectedDate, 'EEE d MMMM')}</h2>
            <p className="font-mono text-xs font-semibold text-on-surface-variant">{selectedEvents.length ? `${selectedEvents.length} events` : 'Free day'}</p>
          </div>
          <button onClick={() => onOpen(selectedDate)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm shadow-primary/30">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 px-3 pb-3">
          {selectedEvents.length ? (
            selectedEvents.map((event) => {
              const start = eventDate(event.start);
              const end = eventDate(event.end);
              const style = eventStyle[event.type];
              return (
                <button key={event.id} onClick={() => onEdit(event)} className={`relative w-full overflow-hidden rounded-xl py-3 pl-4 pr-3 text-left ${style.card}`}>
                  <span className={`absolute inset-y-0 left-0 w-1 ${style.accentBar}`} />
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    {event.learning_goal && <GraduationCap className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{event.title}</span>
                  </span>
                  <span className="mt-1 block font-mono text-xs font-semibold opacity-80">
                    {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
                  </span>
                </button>
              );
            })
          ) : (
            <button onClick={() => onOpen(selectedDate)} className="w-full rounded-xl border border-dashed border-outline-variant py-6 text-center text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low">
              Add event
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function EventModal({ draft, setDraft, error, conflicts, saving, deleting, onClose, onSave, onDelete, onUnlink }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft | null>>; error: string; conflicts: CalendarEvent[]; saving: boolean; deleting: boolean; onClose: () => void; onSave: () => void; onDelete: () => void; onUnlink: () => void }) {
  const valid = draft.title.trim() && (draft.endsNextDay || draft.endTime > draft.startTime);
  const set = (patch: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...patch } : current));
  const style = eventStyle[draft.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface shadow-2xl">
        <div className={`h-1.5 w-full ${style.accentBar}`} />
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="font-heading text-xl font-extrabold text-on-surface">{draft.id ? 'Edit event' : 'New event'}</h2>
          <button aria-label="Close" className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-auto px-6 py-5">
          {draft.learning_goal && (
            <div className="rounded-2xl border border-cal-learning-accent/30 bg-cal-learning-bg px-4 py-3 text-cal-learning-text">
              <div className="flex items-start gap-2">
                <GraduationCap className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Automatically scheduled by AI for the goal "{draft.learning_goal_subject || draft.title.replace(/^Study:\s*/, '')}"</p>
                  <button type="button" onClick={onUnlink} className="mt-2 text-xs font-bold underline underline-offset-4">Unlink</button>
                </div>
              </div>
            </div>
          )}

          <input
            autoFocus
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Event title"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 font-heading text-lg font-bold text-on-surface placeholder:font-normal placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-3 font-mono text-sm text-on-surface focus:border-primary focus:outline-none" />
            <input type="time" value={draft.startTime} onChange={(e) => set({ startTime: e.target.value })} className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-3 font-mono text-sm text-on-surface focus:border-primary focus:outline-none" />
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => set({ endTime: e.target.value })}
              className={`rounded-xl border bg-surface-container-low px-3 py-3 font-mono text-sm text-on-surface focus:outline-none ${
                !draft.endsNextDay && draft.endTime <= draft.startTime ? 'border-error' : 'border-outline-variant focus:border-primary'
              }`}
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
            <input type="checkbox" checked={draft.endsNextDay} onChange={(e) => set({ endsNextDay: e.target.checked })} className="h-4 w-4 rounded border-outline-variant accent-primary" />
            Ends next day
          </label>
          {!draft.endsNextDay && draft.endTime <= draft.startTime && <p className="text-sm font-semibold text-error">End time must be later than start time.</p>}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">Category</p>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((type) => {
                const s = eventStyle[type];
                const active = draft.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set({ type })}
                    className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition-all ${
                      active ? `border-transparent ${s.card} ring-2 ring-offset-1 ring-offset-surface ${s.ring}` : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Description (optional)" rows={3} className="w-full resize-y rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none" />

          {conflicts.length > 0 && (
            <p className="rounded-xl border border-tertiary/30 bg-tertiary-container/10 px-3 py-2 text-sm font-semibold text-tertiary">
              Overlaps with "{conflicts[0].title}". You'll be asked to confirm before saving.
            </p>
          )}
          {error && <p className="text-sm font-semibold text-error">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-outline-variant/60 bg-surface-container-low px-6 py-4">
          {draft.id ? (
            <button disabled={deleting} onClick={onDelete} className="flex items-center gap-1.5 text-sm font-bold text-error transition-opacity hover:opacity-80 disabled:opacity-50">
              <Trash2 size={16} />
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          ) : (
            <span />
          )}
          <button disabled={!valid || saving} onClick={onSave} className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary shadow-sm shadow-primary/30 transition-opacity hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save event'}
          </button>
        </div>
      </div>
    </div>
  );
}

function setTime(day: Date, hour: number, onOpen: (day: Date) => void) {
  const date = new Date(day);
  date.setHours(hour, 0, 0, 0);
  onOpen(date);
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'pm' : 'am';
  const value = hour % 12 || 12;
  return `${value} ${suffix}`;
}

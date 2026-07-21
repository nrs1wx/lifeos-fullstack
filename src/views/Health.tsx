import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Droplets,
  Dumbbell,
  HeartPulse,
  Loader2,
  Moon,
  Plus,
  Sparkles,
  TestTubes,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { TopBar } from '../components/TopBar';
import { useStore } from '../store';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

type HealthLog = {
  id: string;
  date: string;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  mood?: number | null;
  stress?: number | null;
  symptoms?: string[];
  medications?: { name: string; time?: string }[] | string[];
  sleepHours?: number | null;
  sleepStart?: string;
  sleepEnd?: string;
  waterMl?: number | null;
  activityMinutes?: number | null;
  activityLevel?: string;
  journal?: string;
};

type LabResult = {
  id: string;
  testName: string;
  date: string;
  value: number;
  unit: string;
  referenceMin: number;
  referenceMax: number;
};

type HealthEntryMode = 'full' | 'sleep' | 'water';

const moodLabels: Record<number, string> = {
  1: 'poor',
  2: 'low',
  3: 'neutral',
  4: 'good',
  5: 'great',
};

const activityLabels: Record<string, string> = {
  low: 'low activity',
  medium: 'moderate activity',
  high: 'high activity',
};

const today = () => new Date().toISOString().split('T')[0];
const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const formatDate = (value: string, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) =>
  new Date(value).toLocaleDateString('en-US', options);
const parseList = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);
const formatMedications = (medications?: HealthLog['medications']) => {
  if (!medications?.length) return [];
  return medications.map(item => typeof item === 'string' ? item : item.name).filter(Boolean);
};
const labStatus = (result: LabResult) => result.value < result.referenceMin ? 'below range' : result.value > result.referenceMax ? 'above range' : 'in range';
const calculateSleepHours = (start: string, end: string) => {
  if (!start || !end) return null;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  if (![startH, startM, endH, endM].every(Number.isFinite)) return null;
  let minutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (minutes <= 0) minutes += 24 * 60;
  return Number((minutes / 60).toFixed(1));
};

function MetricCard({ label, value, subtext, icon: Icon }: { label: string; value: string; subtext?: string; icon: React.ElementType }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-4 min-h-[116px] flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3 text-on-surface-variant">
        <span className="text-[12px] font-mono uppercase">{label}</span>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[28px] font-heading font-extrabold text-on-surface leading-tight">{value}</div>
        {subtext && <div className="text-[12px] text-on-surface-variant mt-1">{subtext}</div>}
      </div>
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xl flex flex-col w-full max-w-3xl max-h-[calc(100vh-2rem)]">
        <div className="flex justify-between items-center px-5 py-4 border-b border-outline-variant">
          <h2 className="text-[20px] font-heading font-bold text-on-surface">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-variant text-on-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Health() {
  const { healthLogs, labResults, addEntity, deleteEntity, addActivity, addToast, calendarEvents, weatherForecast } = useStore();
  const logs = useMemo(
    () => [...(healthLogs as HealthLog[])]
      .filter(log => !String(log.id || '').startsWith('seed-'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [healthLogs]
  );
  const latestLog = logs.at(-1) || null;
  const latestWeightLog = [...logs].reverse().find(log => asNumber(log.weight) !== null) || null;
  const latestSleepLog = [...logs].reverse().find(log => asNumber(log.sleepHours) !== null || Boolean(log.sleepStart || log.sleepEnd)) || null;
  const latestWaterLog = [...logs].reverse().find(log => asNumber(log.waterMl) !== null) || null;
  const latestVitalsLog = [...logs].reverse().find(log => asNumber(log.bloodPressureSystolic) !== null || asNumber(log.bloodPressureDiastolic) !== null || asNumber(log.heartRate) !== null) || null;
  const latestMoodLog = [...logs].reverse().find(log => asNumber(log.mood) !== null || asNumber(log.stress) !== null) || null;
  const latestActivityLog = [...logs].reverse().find(log => asNumber(log.activityMinutes) !== null || Boolean(log.activityLevel)) || null;
  const recentLogs = [...logs].reverse().slice(0, 5);

  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [labToDelete, setLabToDelete] = useState<string | null>(null);
  const [isLogHealthOpen, setIsLogHealthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<HealthEntryMode>('full');
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState<string | null>(null);
  const [isSavingHealth, setIsSavingHealth] = useState(false);
  const [healthFormError, setHealthFormError] = useState('');
  const [isSavingLab, setIsSavingLab] = useState(false);
  const [labFormError, setLabFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entryDate, setEntryDate] = useState(today());
  const [weight, setWeight] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [sys, setSys] = useState<number | ''>('');
  const [dia, setDia] = useState<number | ''>('');
  const [heartRate, setHeartRate] = useState<number | ''>('');
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(5);
  const [waterMl, setWaterMl] = useState<number | ''>('');
  const [sleepStart, setSleepStart] = useState('');
  const [sleepEnd, setSleepEnd] = useState('');
  const [sleepH, setSleepH] = useState<number | ''>('');
  const [activityMinutes, setActivityMinutes] = useState<number | ''>('');
  const [activityLevel, setActivityLevel] = useState('medium');
  const [symptomsText, setSymptomsText] = useState('');
  const [medicationsText, setMedicationsText] = useState('');
  const [journal, setJournal] = useState('');

  const [labTestName, setLabTestName] = useState('');
  const [labDate, setLabDate] = useState(today());
  const [labValue, setLabValue] = useState<number | ''>('');
  const [labUnit, setLabUnit] = useState('');
  const [labRefMin, setLabRefMin] = useState<number | ''>('');
  const [labRefMax, setLabRefMax] = useState<number | ''>('');

  const resetHealthForm = (mode: HealthEntryMode) => {
    setEntryDate(today());
    setWeight(mode === 'full' ? latestWeightLog?.weight ?? '' : '');
    setHeight(mode === 'full' ? latestWeightLog?.height ?? '' : '');
    setSys(mode === 'full' ? latestLog?.bloodPressureSystolic ?? '' : '');
    setDia(mode === 'full' ? latestLog?.bloodPressureDiastolic ?? '' : '');
    setHeartRate(mode === 'full' ? latestLog?.heartRate ?? '' : '');
    setMood(mode === 'full' ? latestLog?.mood || 3 : 3);
    setStress(mode === 'full' ? latestLog?.stress || 5 : 5);
    setWaterMl('');
    setSleepStart('');
    setSleepEnd('');
    setSleepH('');
    setActivityMinutes(mode === 'full' ? latestLog?.activityMinutes ?? '' : '');
    setActivityLevel(mode === 'full' ? latestLog?.activityLevel || 'medium' : 'medium');
    setSymptomsText('');
    setMedicationsText('');
    setJournal('');
    setHealthFormError('');
  };

  const openLogHealth = (mode: HealthEntryMode = 'full') => {
    setEntryMode(mode);
    resetHealthForm(mode);
    setIsLogHealthOpen(true);
  };

  const openLabModal = () => {
    setLabTestName('');
    setLabDate(today());
    setLabValue('');
    setLabUnit('');
    setLabRefMin('');
    setLabRefMax('');
    setLabFormError('');
    setIsLabModalOpen(true);
  };

  const latestBmi = asNumber(latestWeightLog?.bmi) ?? (latestWeightLog?.weight && latestWeightLog?.height ? latestWeightLog.weight / ((latestWeightLog.height / 100) ** 2) : null);
  const latestWater = asNumber(latestWaterLog?.waterMl);
  const latestSleep = asNumber(latestSleepLog?.sleepHours);
  const latestActivity = asNumber(latestActivityLog?.activityMinutes);

  const chartData = logs.filter(log => asNumber(log.weight) !== null).map(log => ({
    name: formatDate(log.date),
    weight: asNumber(log.weight),
    sys: asNumber(log.bloodPressureSystolic),
    dia: asNumber(log.bloodPressureDiastolic),
    sleep: asNumber(log.sleepHours),
  }));

  const sleepWeekData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const log = logs.find(item => new Date(item.date).toDateString() === date.toDateString() && asNumber(item.sleepHours) !== null);
    return {
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      sleep: asNumber(log?.sleepHours),
    };
  });
  const hasSleepData = sleepWeekData.some(day => day.sleep !== null);
  const waterWeekData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const log = logs.find(item => new Date(item.date).toDateString() === date.toDateString() && asNumber(item.waterMl) !== null);
    return {
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      water: asNumber(log?.waterMl),
    };
  });
  const hasWaterData = waterWeekData.some(day => day.water !== null);

  const labGroups = useMemo(() => {
    const groups: Record<string, LabResult[]> = {};
    (labResults as LabResult[])
      .filter(result => !String(result.id || '').startsWith('seed-'))
      .forEach(result => {
      if (!groups[result.testName]) groups[result.testName] = [];
      groups[result.testName].push(result);
    });
    Object.values(groups).forEach(group => group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    return groups;
  }, [labResults]);
  const latestLabs = (Object.entries(labGroups) as [string, LabResult[]][])
    .map(([testName, records]) => ({ testName, result: records[records.length - 1] }))
    .filter((item): item is { testName: string; result: LabResult } => Boolean(item.result));
  const selectedLabHistory = selectedLabTest ? labGroups[selectedLabTest] || [] : [];

  const alerts = useMemo(() => {
    const next: string[] = [];
    const lastFive = logs.slice(-5);
    if (lastFive.length >= 2) {
      const first = lastFive[0];
      const last = lastFive[lastFive.length - 1];
      const firstWeight = asNumber(first.weight);
      const lastWeight = asNumber(last.weight);
      if (firstWeight !== null && lastWeight !== null) {
        const diff = lastWeight - firstWeight;
        if (Math.abs(diff) >= 2) {
          next.push(`Weight ${diff > 0 ? 'increased' : 'decreased'} by ${Math.abs(diff).toFixed(1)} kg over ${lastFive.length} entries (${formatDate(first.date)} -> ${formatDate(last.date)}). This looks like a trend, not a one-off fluctuation.`);
        }
      }
    }
    const latestSys = asNumber(latestVitalsLog?.bloodPressureSystolic);
    const latestDia = asNumber(latestVitalsLog?.bloodPressureDiastolic);
    if (latestSys !== null && latestDia !== null && (latestSys >= 120 || latestDia >= 80)) {
      next.push(`Latest blood pressure is ${latestSys}/${latestDia}, close to the upper normal range. Watch the trend.`);
    }
    if (logs.length >= 3) {
      const sleepValues = logs.slice(-7).map(log => asNumber(log.sleepHours)).filter((value): value is number => value !== null);
      const avgSleep = sleepValues.length ? sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length : null;
      if (avgSleep !== null && avgSleep < 7) next.push(`Average sleep in recent entries is ${avgSleep.toFixed(1)}h. Add bedtime and wake-up time for better tracking.`);
    }
    const abnormalLab = latestLabs.find(({ result }) => labStatus(result) !== 'in range');
    if (abnormalLab) {
      next.push(`${abnormalLab.testName}: ${abnormalLab.result.value} ${abnormalLab.result.unit}, ${labStatus(abnormalLab.result)} versus reference range ${abnormalLab.result.referenceMin}-${abnormalLab.result.referenceMax}.`);
    }
    return next;
  }, [logs, latestVitalsLog, latestLabs]);

  const workoutWindows = useMemo(() => {
    return (weatherForecast as any[])
      .map(slot => {
        const date = new Date(slot.date);
        date.setHours(Number(slot.hour || 0), Number(slot.minute || 0), 0, 0);
        const hasEvent = (calendarEvents as any[]).some(event => {
          const start = new Date(event.start).getTime();
          const end = new Date(event.end).getTime();
          return date.getTime() >= start && date.getTime() < end;
        });
        let score = 100;
        if (slot.temp < 15 || slot.temp > 25) score -= 20;
        if (slot.precipitation > 0) score -= 40;
        if (slot.uvIndex > 5) score -= 15;
        if (hasEvent) score -= 60;
        return { ...slot, score, date };
      })
      .filter(slot => slot.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [weatherForecast, calendarEvents]);

  const handleLogHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightValue = asNumber(weight);
    const heightValue = asNumber(height);
    if (entryMode === 'full' && (weightValue === null || weightValue <= 0)) return setHealthFormError('Enter a valid weight.');
    if (entryMode === 'full' && (heightValue === null || heightValue <= 0)) return setHealthFormError('Enter a valid height.');
    const calculatedSleep = calculateSleepHours(sleepStart, sleepEnd);
    const finalSleep = calculatedSleep ?? asNumber(sleepH);
    const finalWater = asNumber(waterMl);
    if (entryMode === 'sleep' && finalSleep === null) return setHealthFormError('Enter sleep time or total sleep hours.');
    if (entryMode === 'water' && (finalWater === null || finalWater <= 0)) return setHealthFormError('Enter water amount in ml.');
    const bmi = weightValue !== null && heightValue !== null ? weightValue / ((heightValue / 100) * (heightValue / 100)) : null;

    setIsSavingHealth(true);
    setHealthFormError('');
    try {
      const entity: HealthLog = {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date(`${entryDate}T${new Date().toTimeString().slice(0, 8)}`).toISOString(),
      };
      if (entryMode === 'full') {
        entity.weight = weightValue;
        entity.height = heightValue;
        entity.bmi = bmi === null ? null : Number(bmi.toFixed(1));
        entity.bloodPressureSystolic = asNumber(sys);
        entity.bloodPressureDiastolic = asNumber(dia);
        entity.heartRate = asNumber(heartRate);
        entity.mood = mood;
        entity.stress = stress;
        entity.symptoms = parseList(symptomsText);
        entity.medications = parseList(medicationsText).map(name => ({ name }));
        entity.activityMinutes = asNumber(activityMinutes);
        entity.activityLevel = activityLevel;
        entity.journal = journal.trim();
      }
      if (entryMode === 'full' || entryMode === 'sleep') {
        entity.sleepStart = sleepStart;
        entity.sleepEnd = sleepEnd;
        entity.sleepHours = finalSleep;
      }
      if (entryMode === 'full' || entryMode === 'water') {
        entity.waterMl = finalWater;
      }
      await addEntity('healthLogs', entity);
      addActivity(entryMode === 'sleep' ? 'Added sleep log' : entryMode === 'water' ? 'Added water log' : 'Added health journal entry', 'Health');
      addToast(entryMode === 'sleep' ? 'Sleep saved' : entryMode === 'water' ? 'Water saved' : 'Health entry saved');
      setIsLogHealthOpen(false);
    } catch (err: any) {
      setHealthFormError(err?.message || 'Could not save entry.');
    } finally {
      setIsSavingHealth(false);
    }
  };

  const handleSaveLabResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labTestName.trim() || labValue === '' || !labUnit.trim() || labRefMin === '' || labRefMax === '') {
      setLabFormError('Fill in test name, value, unit, and reference range.');
      return;
    }
    setIsSavingLab(true);
    setLabFormError('');
    try {
      await addEntity('labResults', {
        id: Math.random().toString(36).substring(2, 9),
        testName: labTestName.trim(),
        date: new Date(labDate).toISOString(),
        value: Number(labValue),
        unit: labUnit.trim(),
        referenceMin: Number(labRefMin),
        referenceMax: Number(labRefMax),
      });
      addActivity(`Added lab result: ${labTestName}`, 'Health');
      addToast('Lab result saved');
      setIsLabModalOpen(false);
    } catch (err: any) {
      setLabFormError(err?.message || 'Could not save lab result.');
    } finally {
      setIsSavingLab(false);
    }
  };

  const handleLabUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    openLabModal();
    addToast('File selected. Enter lab values manually.', 'info');
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    await deleteEntity('healthLogs', entryToDelete);
    addToast('Entry deleted');
    setEntryToDelete(null);
  };

  const handleDeleteLab = async () => {
    if (!labToDelete) return;
    await deleteEntity('labResults', labToDelete);
    addToast('Lab result deleted');
    setLabToDelete(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative pb-20 lg:pb-0">
      <TopBar showMobileTitle={false} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 lg:px-10 py-4 border-b border-outline-variant bg-background/95 backdrop-blur-md sticky top-0 z-40">
        <div>
          <div className="text-[12px] text-on-surface-variant font-mono uppercase">LifeOS</div>
          <h2 className="text-[28px] lg:text-[34px] font-heading font-extrabold text-on-surface">Health</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => openLogHealth('full')} className="bg-primary text-on-primary px-4 py-2.5 rounded-lg flex items-center gap-2 text-[13px] font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Journal Entry
          </button>
          <button onClick={() => openLogHealth('sleep')} className="bg-surface text-on-surface border border-outline-variant px-4 py-2.5 rounded-lg flex items-center gap-2 text-[13px] font-medium hover:bg-surface-variant">
            <Moon className="w-4 h-4" /> Add Sleep
          </button>
          <button onClick={() => openLogHealth('water')} className="bg-surface text-on-surface border border-outline-variant px-4 py-2.5 rounded-lg flex items-center gap-2 text-[13px] font-medium hover:bg-surface-variant">
            <Droplets className="w-4 h-4" /> Add Water
          </button>
          <button onClick={openLabModal} className="bg-surface text-on-surface border border-outline-variant px-4 py-2.5 rounded-lg flex items-center gap-2 text-[13px] font-medium hover:bg-surface-variant">
            <TestTubes className="w-4 h-4" /> Add Lab
          </button>
        </div>
      </div>

      <div className="p-4 lg:p-10 max-w-[1280px] mx-auto w-full space-y-6 overflow-y-auto custom-scrollbar flex-1">
        <section className="bg-surface border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-[18px] font-heading font-bold text-on-surface">AI Health Alerts</h3>
          </div>
          {alerts.length === 0 ? (
            <p className="text-[14px] text-on-surface-variant">
              {logs.length === 0 ? 'Add journal entries to see health trend alerts.' : 'No critical alerts in the current data.'}
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={index} className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-[14px] text-on-surface">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <p>{alert}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Weight" value={latestWeightLog?.weight ? `${latestWeightLog.weight} kg` : '—'} subtext={latestWeightLog ? formatDate(latestWeightLog.date, { day: '2-digit', month: 'short', year: 'numeric' }) : 'no entries'} icon={Activity} />
          <MetricCard label="BMI" value={latestBmi !== null ? latestBmi.toFixed(1) : '—'} subtext={latestBmi === null ? 'no data' : latestBmi < 18.5 ? 'below range' : latestBmi < 25 ? 'normal' : 'above range'} icon={HeartPulse} />
          <MetricCard label="Blood Pressure / Pulse" value={latestVitalsLog?.bloodPressureSystolic && latestVitalsLog?.bloodPressureDiastolic ? `${latestVitalsLog.bloodPressureSystolic}/${latestVitalsLog.bloodPressureDiastolic}` : '—'} subtext={latestVitalsLog?.heartRate ? `${latestVitalsLog.heartRate} bpm` : 'pulse not entered'} icon={HeartPulse} />
          <MetricCard label="Mood" value={moodLabels[Number(latestMoodLog?.mood || 0)] || '—'} subtext={latestMoodLog?.stress ? `stress ${latestMoodLog.stress}/10` : 'not rated'} icon={Sparkles} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-surface border border-outline-variant rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-primary" />
                <h3 className="text-[16px] font-heading font-bold text-on-surface">Sleep</h3>
              </div>
              <span className="text-[22px] font-heading font-extrabold text-on-surface">{latestSleep !== null ? `${latestSleep}h` : '—'}</span>
            </div>
            <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${latestSleep !== null ? Math.min(100, latestSleep / 8 * 100) : 0}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-on-surface-variant">
              <span>{latestSleepLog?.sleepStart && latestSleepLog?.sleepEnd ? `${latestSleepLog.sleepStart} -> ${latestSleepLog.sleepEnd}` : 'No sleep entered yet'}</span>
              <button onClick={() => openLogHealth('sleep')} className="text-primary font-medium hover:underline">Add</button>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-secondary" />
                <h3 className="text-[16px] font-heading font-bold text-on-surface">Water</h3>
              </div>
              <span className="text-[22px] font-heading font-extrabold text-on-surface">{latestWater !== null ? `${latestWater} ml` : '—'}</span>
            </div>
            <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full" style={{ width: `${latestWater !== null ? Math.min(100, latestWater / 2500 * 100) : 0}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-on-surface-variant">
              <span>{latestWater !== null ? `${Math.round(latestWater / 250)} glasses of 250 ml` : 'No water entered yet'}</span>
              <button onClick={() => openLogHealth('water')} className="text-primary font-medium hover:underline">Add</button>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-tertiary" />
                <h3 className="text-[16px] font-heading font-bold text-on-surface">Activity</h3>
              </div>
              <span className="text-[22px] font-heading font-extrabold text-on-surface">{latestActivity !== null ? `${latestActivity} min` : '—'}</span>
            </div>
            <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
              <div className="h-full bg-tertiary rounded-full" style={{ width: `${latestActivity !== null ? Math.min(100, latestActivity / 60 * 100) : 0}%` }} />
            </div>
            <div className="mt-3 text-[13px] text-on-surface-variant">{activityLabels[latestActivityLog?.activityLevel || ''] || 'No activity level entered'}</div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 bg-surface border border-outline-variant rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-heading font-bold text-on-surface">Weight Trend</h3>
              <span className="text-[12px] text-on-surface-variant">{chartData.length} entries</span>
            </div>
            <div className="h-64">
              {chartData.length < 2 ? (
                <div className="h-full flex items-center justify-center text-center text-[14px] text-on-surface-variant">Add at least 2 weight entries to see the trend.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} dy={10} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} dx={-8} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-outline-variant)' }} formatter={(value) => [`${value} kg`, 'weight']} />
                    <Area type="monotone" dataKey="weight" stroke="var(--color-primary)" strokeWidth={2} fill="url(#weightGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="bg-surface border border-outline-variant rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-heading font-bold text-on-surface">Sleep This Week</h3>
                <Moon className="w-5 h-5 text-primary" />
              </div>
              <div className="h-52">
                {!hasSleepData ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-[14px] text-on-surface-variant">
                    <span>No sleep data yet.</span>
                    <button onClick={() => openLogHealth('sleep')} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-[13px] font-medium">Add Sleep</button>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sleepWeekData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} dx={-8} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-outline-variant)' }} formatter={(value) => [`${value}h`, 'sleep']} />
                      <Bar dataKey="sleep" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-surface border border-outline-variant rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-heading font-bold text-on-surface">Water This Week</h3>
                <Droplets className="w-5 h-5 text-secondary" />
              </div>
              <div className="h-52">
                {!hasWaterData ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-[14px] text-on-surface-variant">
                    <span>No water data yet.</span>
                    <button onClick={() => openLogHealth('water')} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-[13px] font-medium">Add Water</button>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={waterWeekData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} dx={-8} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-outline-variant)' }} formatter={(value) => [`${value} ml`, 'water']} />
                      <Bar dataKey="water" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 bg-surface border border-outline-variant rounded-lg p-5">
            <h3 className="text-[18px] font-heading font-bold text-on-surface mb-4">Journal - Recent Entries</h3>
            {recentLogs.length === 0 ? (
              <div className="py-10 text-center text-[14px] text-on-surface-variant">No entries yet.</div>
            ) : (
              <div className="divide-y divide-outline-variant">
                {recentLogs.map(log => {
                  const tags = [...(log.symptoms || []), ...formatMedications(log.medications), activityLabels[log.activityLevel || '']].filter(Boolean);
                  return (
                    <div key={log.id} className="py-4 flex gap-4">
                      <div className="w-14 shrink-0 text-[13px] font-medium text-on-surface-variant">{formatDate(log.date)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-on-surface">
                          {log.weight && <span className="font-semibold">{log.weight} kg</span>}
                          {log.bloodPressureSystolic && log.bloodPressureDiastolic && <span>{log.bloodPressureSystolic}/{log.bloodPressureDiastolic}</span>}
                          {log.heartRate && <span>{log.heartRate} bpm</span>}
                          {log.sleepHours && <span>{log.sleepHours}h sleep</span>}
                        </div>
                        {tags.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{tags.map(tag => <span key={tag} className="px-2 py-1 rounded-md bg-surface-container-low text-[12px] text-on-surface-variant border border-outline-variant">{tag}</span>)}</div>}
                        {log.journal && <p className="mt-2 text-[13px] text-on-surface-variant leading-relaxed">{log.journal}</p>}
                      </div>
                      <button aria-label="Delete entry" onClick={() => setEntryToDelete(log.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="bg-surface border border-outline-variant rounded-lg p-5">
              <h3 className="text-[18px] font-heading font-bold text-on-surface mb-4">Best Workout Windows</h3>
              {workoutWindows.length === 0 ? (
                <p className="text-[14px] text-on-surface-variant">No weather data available to calculate workout windows.</p>
              ) : (
                <div className="space-y-3">
                  {workoutWindows.map((slot, index) => (
                    <div key={`${slot.date.toISOString()}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low border border-outline-variant p-3">
                      <div>
                        <div className="font-medium text-on-surface text-[14px]">{slot.date.toLocaleDateString('en-US', { weekday: 'short' })}, {slot.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-[12px] text-on-surface-variant">{slot.temp}°C, {slot.precipitation > 0 ? 'rain expected' : 'no rain'}, UV {slot.uvIndex ?? '—'}</div>
                      </div>
                      <div className="text-[22px] font-heading font-extrabold text-primary">{slot.score}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-surface border border-outline-variant rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-heading font-bold text-on-surface">Labs</h3>
                <div className="flex gap-2">
                  <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleLabUpload} />
                  <button aria-label="Upload file" onClick={() => fileInputRef.current?.click()} className="w-8 h-8 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-variant"><Upload className="w-4 h-4" /></button>
                  <button aria-label="Add lab result" onClick={openLabModal} className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              {latestLabs.length === 0 ? (
                <p className="text-[14px] text-on-surface-variant">No lab results yet.</p>
              ) : (
                <div className="space-y-3">
                  {latestLabs.map(({ testName, result }) => (
                    <button key={testName} onClick={() => setSelectedLabTest(testName)} className="w-full text-left rounded-lg border border-outline-variant p-3 hover:bg-surface-container-low">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-on-surface">{testName}</div>
                        <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                      </div>
                      <div className="mt-1 text-[12px] text-on-surface-variant">{result.value} {result.unit} · range {result.referenceMin}-{result.referenceMax} · {formatDate(result.date)}</div>
                      <div className={`mt-2 text-[12px] font-medium ${labStatus(result) === 'in range' ? 'text-secondary' : 'text-error'}`}>{labStatus(result)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {isLogHealthOpen && (
        <ModalShell title={entryMode === 'sleep' ? 'Add Sleep' : entryMode === 'water' ? 'Add Water' : 'Health Journal Entry'} onClose={() => setIsLogHealthOpen(false)}>
          <form onSubmit={handleLogHealth} className="p-5 overflow-y-auto custom-scrollbar space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <label className="sm:col-span-2 block text-[12px] font-medium text-on-surface-variant">
                Date
                <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
              {entryMode === 'full' && (
                <>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Weight (kg)
                <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Height (cm)
                <input type="number" value={height} onChange={e => setHeight(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
                </>
              )}
            </div>

            {entryMode === 'full' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="block text-[12px] font-medium text-on-surface-variant">
                BP Systolic
                <input type="number" value={sys} onChange={e => setSys(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                BP Diastolic
                <input type="number" value={dia} onChange={e => setDia(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Pulse
                <input type="number" value={heartRate} onChange={e => setHeartRate(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Water (ml)
                <input type="number" value={waterMl} onChange={e => setWaterMl(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
            </div>
            )}

            {entryMode === 'water' && (
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Water (ml)
                <input autoFocus type="number" value={waterMl} onChange={e => setWaterMl(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 2000" className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
            )}

            {(entryMode === 'full' || entryMode === 'sleep') && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Sleep From
                <input type="time" value={sleepStart} onChange={e => setSleepStart(e.target.value)} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Sleep To
                <input type="time" value={sleepEnd} onChange={e => setSleepEnd(e.target.value)} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Sleep (hours)
                <input type="number" step="0.1" value={calculateSleepHours(sleepStart, sleepEnd) ?? sleepH} onChange={e => setSleepH(e.target.value === '' ? '' : Number(e.target.value))} disabled={Boolean(sleepStart && sleepEnd)} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary disabled:opacity-70" />
              </label>
              {entryMode === 'full' && (
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Activity (min)
                <input type="number" value={activityMinutes} onChange={e => setActivityMinutes(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
              )}
            </div>
            )}

            {entryMode === 'full' && (
              <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-2">Mood</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button type="button" key={value} onClick={() => setMood(value)} className={`h-10 rounded-lg text-[13px] font-medium border ${mood === value ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low border-outline-variant text-on-surface'}`}>
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Activity Level
                <select value={activityLevel} onChange={e => setActivityLevel(e.target.value)} className="mt-2 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary">
                  <option value="low">Low</option>
                  <option value="medium">Moderate</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <label className="block text-[12px] font-medium text-on-surface-variant">
              Stress: {stress}/10
              <input type="range" min="1" max="10" value={stress} onChange={e => setStress(Number(e.target.value))} className="mt-2 w-full h-2 block accent-primary" />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Symptoms
                <input type="text" value={symptomsText} onChange={e => setSymptomsText(e.target.value)} placeholder="fatigue, headache" className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Supplements / Medications
                <input type="text" value={medicationsText} onChange={e => setMedicationsText(e.target.value)} placeholder="Vitamin D, magnesium" className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
            </div>

            <label className="block text-[12px] font-medium text-on-surface-variant">
              Note
              <textarea value={journal} onChange={e => setJournal(e.target.value)} rows={4} placeholder="How you felt today, what affected your health..." className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary resize-y" />
            </label>
              </>
            )}

            {healthFormError && <p className="text-error text-[13px]">{healthFormError}</p>}
            <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant">
              <button type="button" onClick={() => setIsLogHealthOpen(false)} className="px-4 py-2 rounded-lg text-[14px] text-on-surface hover:bg-surface-variant">Cancel</button>
              <button type="submit" disabled={isSavingHealth} className="bg-primary text-on-primary px-5 py-2 rounded-lg text-[14px] font-medium disabled:opacity-50 flex items-center gap-2">
                {isSavingHealth && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {isLabModalOpen && (
        <ModalShell title="Add Lab Result" onClose={() => setIsLabModalOpen(false)}>
          <form onSubmit={handleSaveLabResult} className="p-5 overflow-y-auto custom-scrollbar space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Test Name
                <input type="text" value={labTestName} onChange={e => setLabTestName(e.target.value)} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" placeholder="Vitamin D" />
              </label>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Date
                <input type="date" value={labDate} onChange={e => setLabDate(e.target.value)} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Value
                <input type="number" step="0.1" value={labValue} onChange={e => setLabValue(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Unit
                <input type="text" value={labUnit} onChange={e => setLabUnit(e.target.value)} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" placeholder="ng/mL" />
              </label>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Ref. Min
                <input type="number" step="0.1" value={labRefMin} onChange={e => setLabRefMin(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
              <label className="block text-[12px] font-medium text-on-surface-variant">
                Ref. Max
                <input type="number" step="0.1" value={labRefMax} onChange={e => setLabRefMax(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary" />
              </label>
            </div>
            {labFormError && <p className="text-error text-[13px]">{labFormError}</p>}
            <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant">
              <button type="button" onClick={() => setIsLabModalOpen(false)} className="px-4 py-2 rounded-lg text-[14px] text-on-surface hover:bg-surface-variant">Cancel</button>
              <button type="submit" disabled={isSavingLab} className="bg-primary text-on-primary px-5 py-2 rounded-lg text-[14px] font-medium disabled:opacity-50 flex items-center gap-2">
                {isSavingLab && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {selectedLabTest && (
        <ModalShell title={selectedLabTest} onClose={() => setSelectedLabTest(null)}>
          <div className="p-5 overflow-y-auto custom-scrollbar space-y-5">
            {selectedLabHistory.length > 1 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedLabHistory.map(result => ({ ...result, dateStr: formatDate(result.date) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" />
                    <XAxis dataKey="dateStr" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} dy={10} />
                    <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} dx={-8} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-outline-variant)' }} />
                    <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="text-[44px] font-heading font-extrabold text-primary">{selectedLabHistory[0]?.value}</div>
                <div className="text-[13px] text-on-surface-variant">{selectedLabHistory[0]?.unit}</div>
              </div>
            )}
            <div className="space-y-2">
              {selectedLabHistory.slice().reverse().map(result => (
                <div key={result.id} className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant p-3">
                  <div>
                    <div className="text-[14px] font-medium text-on-surface">{formatDate(result.date, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div className="text-[12px] text-on-surface-variant">{result.value} {result.unit} · range {result.referenceMin}-{result.referenceMax}</div>
                  </div>
                  <button aria-label="Delete lab result" onClick={() => setLabToDelete(result.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-on-surface-variant">This is not medical advice. Review lab results with a clinician.</p>
          </div>
        </ModalShell>
      )}

      <ConfirmDialog
        isOpen={!!entryToDelete}
        title="Delete Entry"
        message="Delete this health journal entry?"
        confirmLabel="Delete"
        onConfirm={handleDeleteEntry}
        onCancel={() => setEntryToDelete(null)}
      />
      <ConfirmDialog
        isOpen={!!labToDelete}
        title="Delete Lab Result"
        message="Delete this lab result?"
        confirmLabel="Delete"
        onConfirm={handleDeleteLab}
        onCancel={() => setLabToDelete(null)}
      />
    </div>
  );
}

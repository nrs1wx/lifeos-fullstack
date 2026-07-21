import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { ENTITY_TYPES, EntityType } from '../entityTypes.js';

export const aiRouter = Router();

aiRouter.use(requireAuth);

type AiProvider = 'anthropic' | 'gemini' | 'groq';
type AiSuggestedAction = {
  id: string;
  kind: 'create_entity';
  label: string;
  entityType: EntityType;
  entity: Record<string, any>;
};

const providerLabels: Record<AiProvider, string> = {
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  groq: 'Groq',
};

class AiProviderError extends Error {
  constructor(
    public provider: AiProvider,
    public status: number,
    public responseBody: string,
  ) {
    super('AI_PROVIDER_ERROR');
  }
}

function getAiProvider(): AiProvider {
  const configured = process.env.AI_PROVIDER?.toLowerCase();
  if (configured === 'anthropic' || configured === 'gemini' || configured === 'groq') {
    return configured;
  }

  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';

  return 'gemini';
}

function getProviderApiKey(provider: AiProvider): string | undefined {
  if (provider === 'gemini') return process.env.GEMINI_API_KEY;
  if (provider === 'groq') return process.env.GROQ_API_KEY;
  return process.env.ANTHROPIC_API_KEY;
}

function getProviderKeyName(provider: AiProvider): string {
  if (provider === 'gemini') return 'GEMINI_API_KEY';
  if (provider === 'groq') return 'GROQ_API_KEY';
  return 'ANTHROPIC_API_KEY';
}

function truncate(value: unknown, maxLength = 160): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function parseEntityData(data: string): Record<string, any> | null {
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(entity: Record<string, any>): number {
  const raw = entity.date ?? entity.start ?? entity.startDate ?? entity.deadline ?? entity.createdAt;
  const date = raw ? new Date(String(raw)) : null;
  return date && !Number.isNaN(date.valueOf()) ? date.getTime() : 0;
}

function isIncome(tx: Record<string, any>): boolean {
  return tx.type === 'income' || numberValue(tx.amount) < 0;
}

function safeTimeZone(value: unknown): string {
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return value;
  } catch {
    return fallback;
  }
}

function localDateTime(value: unknown, timeZone: string): string {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.valueOf())) return 'n/a';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('weekday')}, ${get('month')} ${get('day')}, ${get('year')} ${get('hour')}:${get('minute')} ${get('dayPeriod')}`.trim();
}

function localTime(value: unknown, timeZone: string): string {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.valueOf())) return 'n/a';
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function localDateOnly(value: unknown, timeZone: string): string {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.valueOf())) return 'n/a';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function summarizeRecord(type: EntityType, entity: Record<string, any>, timeZone: string): string {
  if (type === 'goals') {
    const subgoals = Array.isArray(entity.subgoals) ? entity.subgoals : [];
    const done = subgoals.filter((item: any) => item.completed || item.done).length;
    return `${truncate(entity.title || entity.goal || 'Goal')}; progress ${numberValue(entity.progress)}%; deadline ${entity.deadline || 'none'}; category ${entity.category || 'General'}; tasks ${done}/${subgoals.length}`;
  }

  if (type === 'habits') {
    return `${truncate(entity.title || entity.name || 'Habit')}; streak ${numberValue(entity.streak)}; best ${numberValue(entity.bestStreak)}; category ${entity.category || 'General'}; completed today ${Boolean(entity.completedToday)}`;
  }

  if (type === 'healthLogs') {
    const bp = entity.bloodPressureSystolic && entity.bloodPressureDiastolic
      ? `${entity.bloodPressureSystolic}/${entity.bloodPressureDiastolic}`
      : 'not recorded';
    const symptoms = Array.isArray(entity.symptoms) ? entity.symptoms.join(', ') : '';
    return `${entity.date || 'no date'}; weight ${entity.weight ?? 'n/a'}kg; BMI ${entity.bmi ?? 'n/a'}; BP ${bp}; pulse ${entity.heartRate ?? 'n/a'}; sleep ${entity.sleepHours ?? 'n/a'}h; water ${entity.waterMl ?? 'n/a'}ml; mood ${entity.mood ?? 'n/a'}; symptoms ${truncate(symptoms || 'none', 80)}`;
  }

  if (type === 'labResults') {
    return `${truncate(entity.testName || entity.name || 'Lab')}; ${entity.value ?? 'n/a'} ${entity.unit || ''}; reference ${entity.referenceMin ?? '?'}-${entity.referenceMax ?? '?'}; date ${entity.date || 'n/a'}`;
  }

  if (type === 'learningPlans') {
    const roadmap = Array.isArray(entity.roadmap) ? entity.roadmap : Array.isArray(entity.weeks) ? entity.weeks : [];
    const taskCount = roadmap.reduce((sum: number, phase: any) => sum + (Array.isArray(phase.tasks) ? phase.tasks.length : 0), 0);
    const doneCount = roadmap.reduce((sum: number, phase: any) => sum + (Array.isArray(phase.tasks) ? phase.tasks.filter((task: any) => task.done).length : 0), 0);
    return `${truncate(entity.goal || entity.title || 'Learning plan')}; ${entity.startDate || 'n/a'} to ${entity.endDate || 'n/a'}; roadmap phases ${roadmap.length}; tasks ${doneCount}/${taskCount}`;
  }

  if (type === 'calendarEvents') {
    return `${truncate(entity.title || 'Event')}; ${entity.type || 'other'}; local date ${localDateOnly(entity.start, timeZone)}; local time ${localTime(entity.start, timeZone)} to ${localTime(entity.end, timeZone)}; start ${localDateTime(entity.start, timeZone)}; end ${localDateTime(entity.end, timeZone)}`;
  }

  if (type === 'notes') {
    return `${truncate(entity.title || 'Note')}; tags ${Array.isArray(entity.tags) ? entity.tags.join(', ') : 'none'}; ${truncate(entity.content || '', 100)}`;
  }

  if (type === 'subscriptions') {
    return `${truncate(entity.name || entity.title || 'Subscription')}; cost ${entity.cost ?? entity.amount ?? 'n/a'}; renews ${entity.renewalDate || entity.nextBillingDate || 'n/a'}`;
  }

  if (type === 'weatherForecast') {
    return `${entity.date || 'forecast'}; ${entity.temp ?? entity.temperature ?? 'n/a'}C; ${truncate(entity.condition || entity.summary || '', 80)}`;
  }

  const summaryFields = ['title', 'name', 'category', 'date', 'status']
    .map((key) => entity[key] ? `${key}: ${truncate(entity[key], 60)}` : null)
    .filter(Boolean);
  return summaryFields.join('; ') || truncate(JSON.stringify(entity), 140);
}

function allowedTypesFromContext(context: any): Set<EntityType> | undefined {
  const access = context?.aiDataAccess;
  if (!access || typeof access !== 'object' || Array.isArray(access)) return undefined;
  const allowed = new Set<EntityType>();
  for (const type of ENTITY_TYPES) {
    if (access[type] !== false) allowed.add(type);
  }
  return allowed;
}

async function buildLifeOsSnapshot(userId: string, timeZone: string, allowedTypes?: Set<EntityType>): Promise<string> {
  const rows = await prisma.entity.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  const grouped = new Map<EntityType, Record<string, any>[]>();
  for (const type of ENTITY_TYPES) {
    if (!allowedTypes || allowedTypes.has(type)) grouped.set(type, []);
  }
  for (const row of rows) {
    if (!(ENTITY_TYPES as readonly string[]).includes(row.entityType)) continue;
    if (allowedTypes && !allowedTypes.has(row.entityType as EntityType)) continue;
    const parsed = parseEntityData(row.data);
    if (parsed) grouped.get(row.entityType as EntityType)?.push(parsed);
  }

  const lines: string[] = [
    'LifeOS data snapshot from the database:',
    `Calendar/timezone rule: all calendar event times below are already formatted in the user's local timezone (${timeZone}). Do not convert them from UTC again.`,
    `Current local date/time: ${localDateTime(new Date().toISOString(), timeZone)}.`,
  ];

  const finances = [...(grouped.get('finances') || [])].sort((a, b) => dateValue(b) - dateValue(a));
  if (finances.length) {
    const income = finances.filter(isIncome).reduce((sum, tx) => sum + Math.abs(numberValue(tx.amount)), 0);
    const expenses = finances.filter((tx) => !isIncome(tx)).reduce((sum, tx) => sum + Math.abs(numberValue(tx.amount)), 0);
    lines.push(`Finance: ${finances.length} transactions; total income ${income}; total expenses ${expenses}; net ${income - expenses}.`);
  }

  const healthLogs = [...(grouped.get('healthLogs') || [])].sort((a, b) => dateValue(b) - dateValue(a));
  if (healthLogs.length) {
    lines.push(`Health/body: ${healthLogs.length} logs; latest ${summarizeRecord('healthLogs', healthLogs[0], timeZone)}.`);
  }

  for (const type of ENTITY_TYPES) {
    if (allowedTypes && !allowedTypes.has(type)) {
      lines.push(`${type}: access disabled by user privacy settings.`);
      continue;
    }
    const records = [...(grouped.get(type) || [])].sort((a, b) => dateValue(b) - dateValue(a));
    if (!records.length) {
      lines.push(`${type}: no records.`);
      continue;
    }

    if (type === 'finances' || type === 'healthLogs') {
      const recent = records.slice(0, 5).map((entity, index) => `${index + 1}. ${summarizeRecord(type, entity, timeZone)}`);
      lines.push(`${type} recent: ${recent.join(' | ')}`);
      continue;
    }

    const limit = type === 'notes' || type === 'calendarEvents' ? 6 : 5;
    const recent = records.slice(0, limit).map((entity, index) => `${index + 1}. ${summarizeRecord(type, entity, timeZone)}`);
    lines.push(`${type}: ${records.length} records. ${recent.join(' | ')}`);
  }

  return lines.join('\n').slice(0, 12000);
}

async function callAnthropic(apiKey: string, systemPrompt: string, message: string, maxTokens = 800): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('Anthropic API error:', response.status, errBody);
    throw new AiProviderError('anthropic', response.status, errBody);
  }

  const data: any = await response.json();
  return (data.content ?? [])
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n')
    .trim();
}

async function callGemini(apiKey: string, systemPrompt: string, message: string, maxTokens = 800): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('Gemini API error:', response.status, errBody);
    throw new AiProviderError('gemini', response.status, errBody);
  }

  const data: any = await response.json();
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((part: any) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function callGroq(apiKey: string, systemPrompt: string, message: string, maxTokens = 800): Promise<string> {
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('Groq API error:', response.status, errBody);
    throw new AiProviderError('groq', response.status, errBody);
  }

  const data: any = await response.json();
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

async function callAiProvider(provider: AiProvider, apiKey: string, systemPrompt: string, message: string, maxTokens?: number): Promise<string> {
  if (provider === 'gemini') return callGemini(apiKey, systemPrompt, message, maxTokens);
  if (provider === 'groq') return callGroq(apiKey, systemPrompt, message, maxTokens);
  return callAnthropic(apiKey, systemPrompt, message, maxTokens);
}

function extractJsonObject(text: string): any | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? text;
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(source.slice(start, end + 1));
  } catch {
    return null;
  }
}

function randomActionId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeActionLabel(value: unknown, fallback: string): string {
  const label = truncate(value, 70);
  return label || fallback;
}

function normalizeActionEntity(type: EntityType, raw: unknown): Record<string, any> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const entity = raw as Record<string, any>;

  if (type === 'goals') {
    const title = truncate(entity.title || entity.goal || entity.name, 120);
    if (!title) return null;
    return {
      title,
      progress: Math.max(0, Math.min(100, numberValue(entity.progress))),
      deadline: truncate(entity.deadline || entity.dueDate || '', 16) || undefined,
      category: truncate(entity.category || 'AI', 40),
      subgoals: Array.isArray(entity.subgoals)
        ? entity.subgoals.slice(0, 6).map((item: any) => ({
            id: randomActionId(),
            title: truncate(typeof item === 'string' ? item : item?.title || item?.text, 140),
            completed: false,
          })).filter((item: any) => item.title)
        : [],
    };
  }

  if (type === 'habits') {
    const title = truncate(entity.title || entity.name, 120);
    if (!title) return null;
    return {
      title,
      category: truncate(entity.category || 'AI', 40),
      streak: 0,
      bestStreak: 0,
      completedToday: false,
      done: [],
    };
  }

  if (type === 'notes') {
    const title = truncate(entity.title || entity.name || 'AI note', 120);
    const content = truncate(entity.content || entity.body || entity.text || '', 2000);
    if (!title && !content) return null;
    return {
      title: title || 'AI note',
      content,
      tags: Array.isArray(entity.tags) ? entity.tags.slice(0, 6).map((tag: any) => truncate(tag, 24)).filter(Boolean) : ['ai'],
      date: entity.date || new Date().toISOString(),
    };
  }

  if (type === 'calendarEvents') {
    const title = truncate(entity.title || entity.name, 120);
    const start = new Date(String(entity.start || entity.startDate || ''));
    const rawEnd = new Date(String(entity.end || entity.endDate || ''));
    if (!title || Number.isNaN(start.valueOf())) return null;
    const end = Number.isNaN(rawEnd.valueOf()) || rawEnd <= start
      ? new Date(start.getTime() + 60 * 60 * 1000)
      : rawEnd;
    const eventType = ['work', 'personal', 'health', 'other'].includes(entity.type) ? entity.type : 'other';
    return {
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      type: eventType,
      description: truncate(entity.description || entity.notes || 'Created from AI Assistant', 500),
    };
  }

  if (type === 'finances') {
    const amount = Math.abs(numberValue(entity.amount));
    const name = truncate(entity.name || entity.title || entity.description, 120);
    if (!amount || !name) return null;
    return {
      name,
      amount,
      date: entity.date || new Date().toISOString(),
      category: truncate(entity.category || 'Misc', 40),
      type: entity.type === 'income' ? 'income' : 'expense',
    };
  }

  if (type === 'learningPlans') {
    const goal = truncate(entity.goal || entity.title || entity.name, 140);
    if (!goal) return null;
    return {
      goal,
      title: goal,
      startDate: truncate(entity.startDate || isoDate(new Date()), 16),
      endDate: truncate(entity.endDate || isoDate(addDays(new Date(), 27)), 16),
      roadmap: Array.isArray(entity.roadmap) ? entity.roadmap.slice(0, 8) : [],
      weeks: Array.isArray(entity.weeks) ? entity.weeks.slice(0, 8) : [],
    };
  }

  return null;
}

function normalizeAiActions(rawActions: unknown): AiSuggestedAction[] {
  if (!Array.isArray(rawActions)) return [];
  const actions: AiSuggestedAction[] = [];

  for (const rawAction of rawActions.slice(0, 4)) {
    if (!rawAction || typeof rawAction !== 'object' || Array.isArray(rawAction)) continue;
    const action = rawAction as Record<string, any>;
    if (action.kind && action.kind !== 'create_entity') continue;
    const entityType = action.entityType;
    if (!(ENTITY_TYPES as readonly string[]).includes(entityType)) continue;
    const entity = normalizeActionEntity(entityType as EntityType, action.entity);
    if (!entity) continue;
    actions.push({
      id: randomActionId(),
      kind: 'create_entity',
      label: normalizeActionLabel(action.label, `Create ${entityType}`),
      entityType: entityType as EntityType,
      entity,
    });
  }

  return actions;
}

function normalizeChatResponse(rawReply: string) {
  const parsed = extractJsonObject(rawReply);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { reply: rawReply.trim(), actions: [] as AiSuggestedAction[] };
  }

  const reply = truncate(parsed.reply || parsed.answer || parsed.message || rawReply, 4000);
  return {
    reply: reply || rawReply.trim(),
    actions: normalizeAiActions(parsed.actions),
  };
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function normalizeDateRange(startDateInput: unknown, endDateInput: unknown) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parsedStart = startDateInput ? new Date(String(startDateInput)) : today;
  const startDate = Number.isNaN(parsedStart.valueOf()) ? today : parsedStart;
  startDate.setHours(0, 0, 0, 0);

  const parsedEnd = endDateInput ? new Date(String(endDateInput)) : addDays(startDate, 27);
  const endDate = Number.isNaN(parsedEnd.valueOf()) || parsedEnd <= startDate ? addDays(startDate, 27) : parsedEnd;
  endDate.setHours(0, 0, 0, 0);

  const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
  const phaseCount = Math.max(1, Math.min(8, Math.ceil(durationDays / 7)));

  return {
    startDate: isoDate(startDate),
    endDate: isoDate(endDate),
    durationDays,
    phaseCount,
  };
}

function phaseDateRange(startDate: string, endDate: string, phaseIndex: number, phaseCount: number) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  const phaseStartOffset = Math.floor((totalDays * phaseIndex) / phaseCount);
  const phaseEndOffset = Math.max(phaseStartOffset, Math.floor((totalDays * (phaseIndex + 1)) / phaseCount) - 1);
  return {
    startDate: isoDate(addDays(start, phaseStartOffset)),
    endDate: isoDate(addDays(start, Math.min(totalDays - 1, phaseEndOffset))),
  };
}

function normalizeLearningPlan(raw: any, goal: string, startDate: string, endDate: string, phaseCount: number) {
  const sourceRoadmap = Array.isArray(raw?.roadmap) ? raw.roadmap : Array.isArray(raw?.phases) ? raw.phases : [];
  const sourceWeeks = Array.isArray(raw?.weeks) ? raw.weeks : [];
  const sourcePhases = sourceRoadmap.length ? sourceRoadmap : sourceWeeks;

  const roadmap = Array.from({ length: phaseCount }, (_, index) => {
    const sourcePhase = sourcePhases[index] || {};
    const range = phaseDateRange(startDate, endDate, index, phaseCount);
    const sourceTasks = Array.isArray(sourcePhase.tasks) ? sourcePhase.tasks : [];
    const tasks = sourceTasks
      .map((task: any, taskIndex: number) => ({
        id: `roadmap-${index + 1}-${taskIndex + 1}-${Math.random().toString(36).slice(2, 7)}`,
        text: truncate(typeof task === 'string' ? task : task?.text, 140),
        done: false,
      }))
      .filter((task: { text: string }) => task.text);

    return {
      phaseNumber: index + 1,
      title: truncate(sourcePhase.title || sourcePhase.name || `Phase ${index + 1}`, 80),
      startDate: truncate(sourcePhase.startDate || range.startDate, 16),
      endDate: truncate(sourcePhase.endDate || range.endDate, 16),
      outcome: truncate(sourcePhase.outcome || sourcePhase.milestone || `Reach the next measurable step toward ${goal}.`, 180),
      tasks: tasks.length ? tasks : [
        { id: `roadmap-${index + 1}-1-${Math.random().toString(36).slice(2, 7)}`, text: `Study the core topic for this phase of ${goal}`, done: false },
        { id: `roadmap-${index + 1}-2-${Math.random().toString(36).slice(2, 7)}`, text: 'Build one practical exercise or project piece', done: false },
        { id: `roadmap-${index + 1}-3-${Math.random().toString(36).slice(2, 7)}`, text: 'Review progress and write the next action', done: false },
      ],
    };
  });

  return {
    goal,
    startDate,
    endDate,
    durationDays: Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1),
    roadmap,
    weeks: roadmap.map((phase) => ({
      weekNumber: phase.phaseNumber,
      title: phase.title,
      tasks: phase.tasks,
    })),
  };
}

aiRouter.post('/learning-plan', async (req: AuthedRequest, res) => {
  const goal = truncate(req.body?.goal, 120);
  const range = normalizeDateRange(req.body?.startDate, req.body?.endDate);
  if (!goal) return res.status(400).json({ error: 'Learning goal is required.' });

  const provider = getAiProvider();
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    return res.status(503).json({
      error: `AI assistant is not configured: ${getProviderKeyName(provider)} is missing on the server.`,
    });
  }

  try {
    const timeZone = safeTimeZone(req.body?.context?.timezone);
    const snapshot = await buildLifeOsSnapshot(req.userId!, timeZone, allowedTypesFromContext(req.body?.context));
    const systemPrompt =
      'You create practical LifeOS learning roadmaps. Return only valid JSON, no markdown. ' +
      'The JSON shape must be {"roadmap":[{"phaseNumber":1,"title":"...","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","outcome":"...","tasks":[{"text":"..."}]}]}. ' +
      'Use concrete outcomes and tasks. Match the user language if obvious from the goal.';
    const prompt =
      `Create the best roadmap for this goal: "${goal}". Date range: ${range.startDate} to ${range.endDate}. ` +
      `Use exactly ${range.phaseCount} phases. Each phase needs an outcome and 3-5 concrete tasks. ` +
      'Use the LifeOS data snapshot to avoid overload, align with existing goals, and make progress measurable.\n\n' +
      snapshot;
    const rawReply = await callAiProvider(provider, apiKey, systemPrompt, prompt, 1400);
    const parsed = extractJsonObject(rawReply);
    res.json({ plan: normalizeLearningPlan(parsed, goal, range.startDate, range.endDate, range.phaseCount) });
  } catch (err) {
    console.error('AI learning plan failed:', err);
    if (err instanceof AiProviderError && err.status === 429) {
      return res.status(429).json({
        error: `${providerLabels[provider]} quota is exhausted for this API key. Check the provider billing/quota page or use another key.`,
      });
    }
    res.status(502).json({
      error: `${providerLabels[provider]} could not generate the learning plan. Check ${getProviderKeyName(provider)}, model name, and account limits.`,
    });
  }
});

aiRouter.post('/chat', async (req: AuthedRequest, res) => {
  const { message, context } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'The message field is required.' });
  }

  const provider = getAiProvider();
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    const keyName = getProviderKeyName(provider);
    return res.status(503).json({
      error:
        `AI assistant is not configured: ${keyName} is missing on the server. ` +
        `Add it to server/.env and restart the backend.`,
    });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  const timeZone = safeTimeZone(context?.timezone);
  const localNow = context?.localNow ? localDateTime(context.localNow, timeZone) : localDateTime(new Date().toISOString(), timeZone);

  const contextLines: string[] = [];
  if (user?.name) contextLines.push(`User's name: ${user.name}`);
  if (user?.city) contextLines.push(`User's city: ${user.city}`);
  contextLines.push(`User's timezone: ${timeZone}`);
  contextLines.push(`Current local time: ${localNow}`);
  if (context?.activeGoal) contextLines.push(`User's active goal: ${context.activeGoal}`);
  if (context?.learningFocus) contextLines.push(`User's current learning focus: ${context.learningFocus}`);
  const snapshot = await buildLifeOsSnapshot(req.userId!, timeZone, allowedTypesFromContext(context));

  const systemPrompt =
    'You are the LifeOS Assistant, a concise, friendly personal-productivity copilot inside the ' +
    'LifeOS app (goals, habits, health, finance, calendar, notes, and learning modules). ' +
    'You can analyze the user data snapshot below. Do not invent records that are not in the snapshot. ' +
    'For calendar and availability questions, use the local calendar times exactly as shown in the snapshot; never reinterpret them as UTC. ' +
    'If a module has no records, say that data is missing and suggest what to add. ' +
    'Answer in the same language the user writes in. Keep replies short and actionable (2-6 sentences unless the user asks for detail). ' +
    'Return only valid JSON with this shape: {"reply":"short user-facing answer","actions":[...]}. ' +
    'The actions array is optional and should contain at most 4 user-confirmed suggestions. ' +
    'Use actions only when the user asks to plan, schedule, create, save, track, or when your answer has concrete next steps worth saving. ' +
    'Each action must be {"kind":"create_entity","label":"button label","entityType":"goals|habits|notes|calendarEvents|finances|learningPlans","entity":{...}}. ' +
    'Never propose delete or destructive actions. Calendar entity fields must include title, start, end, type, and optional description. ' +
    'Calendar start/end must be concrete ISO-8601 date-time strings inferred from the current local time and user timezone. ' +
    'Goal fields: title, deadline, category, optional subgoals. Habit fields: title, category. Note fields: title, content, tags. ' +
    'Finance fields: name, amount, type income/expense, category, date. Learning plan fields: goal, startDate, endDate.' +
    (contextLines.length ? `\n\nContext about this user:\n${contextLines.join('\n')}` : '') +
    `\n\n${snapshot}`;

  try {
    const rawReply = await callAiProvider(provider, apiKey, systemPrompt, message, 1200);
    const { reply, actions } = normalizeChatResponse(rawReply);

    res.json({ reply: reply || 'Sorry, I could not generate a response.', actions });
  } catch (err) {
    console.error('AI chat failed:', err);
    if (err instanceof AiProviderError && err.status === 429) {
      return res.status(429).json({
        error:
          `${providerLabels[provider]} quota is exhausted for this API key. ` +
          'Check the provider billing/quota page or use another key.',
      });
    }

    res.status(502).json({
      error: `${providerLabels[provider]} returned an error. Check ${getProviderKeyName(provider)}, model name, and account limits.`,
    });
  }
});

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { expectedSessionCount, findFreeSlotsFromEvents } from '../scheduling.js';
import { safeTimeZone } from '../timezone.js';

export const learningRouter = Router();

learningRouter.use(requireAuth);

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function parsePositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function learningSubject(goal: Record<string, any>) {
  return String(goal.subject || goal.goal || goal.title || 'Learning goal').trim();
}

learningRouter.post('/:id/schedule', async (req: AuthedRequest, res) => {
  const goalId = String(req.params.id);
  const userId = req.userId!;
  const goalRow = await prisma.entity.findUnique({
    where: { userId_entityType_entityId: { userId, entityType: 'learningPlans', entityId: goalId } },
  });
  if (!goalRow) return res.status(404).json({ error: 'Learning plan not found.' });

  const goal = JSON.parse(goalRow.data);
  const weeklyHours = parsePositiveNumber(goal.weekly_hours ?? goal.weeklyHours, 2);
  const sessionLengthMinutes = parsePositiveNumber(goal.session_length_minutes ?? goal.sessionLengthMinutes, 60);
  const weeksAhead = Math.max(1, Math.floor(parsePositiveNumber(req.body?.weeksAhead, 2)));
  const timeZone = safeTimeZone(req.body?.timezone ?? req.body?.timeZone);
  const now = new Date();
  const nowTime = now.getTime();
  const subject = learningSubject(goal);

  const calendarRows = await prisma.entity.findMany({ where: { userId, entityType: 'calendarEvents' } });
  const calendarEvents = calendarRows.map((row) => ({ row, event: JSON.parse(row.data) }));
  const futureGenerated = calendarEvents.filter(({ event }) => event.learning_goal === goalId && new Date(event.start).getTime() > nowTime);
  const busyEvents = calendarEvents
    .filter(({ event }) => !(event.learning_goal === goalId && new Date(event.start).getTime() > nowTime))
    .map(({ event }) => event);

  const slots = findFreeSlotsFromEvents(busyEvents, weeklyHours, sessionLengthMinutes, {
    weeksAhead,
    dayStart: '08:00',
    dayEnd: '22:00',
    baseDate: now,
    timeZone,
  });

  if (futureGenerated.length > 0) {
    await prisma.entity.deleteMany({
      where: {
        userId,
        entityType: 'calendarEvents',
        entityId: { in: futureGenerated.map(({ row }) => row.entityId) },
      },
    });
  }

  const timestamp = new Date().toISOString();
  const created = await Promise.all(slots.map(async (slot) => {
    const event = {
      id: randomId(),
      title: `Study: ${subject}`,
      start: slot.start_time,
      end: slot.end_time,
      type: 'learning',
      category: 'learning',
      learning_goal: goalId,
      learning_goal_subject: subject,
      is_recurring: true,
      description: `Automatically scheduled by AI for the goal "${subject}"`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const saved = await prisma.entity.create({
      data: {
        userId,
        entityType: 'calendarEvents',
        entityId: event.id,
        data: JSON.stringify(event),
      },
    });
    return JSON.parse(saved.data);
  }));

  res.status(201).json({
    created,
    count: created.length,
    expected: expectedSessionCount(weeklyHours, sessionLengthMinutes, weeksAhead),
    timeZone,
  });
});

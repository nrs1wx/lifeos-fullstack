import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { isEntityType } from '../entityTypes.js';
import { validateEntity } from '../entityValidation.js';

export const entitiesRouter = Router();

entitiesRouter.use(requireAuth);

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

entitiesRouter.get('/:type', async (req: AuthedRequest, res) => {
  const { type } = req.params;
  if (!isEntityType(type)) return res.status(400).json({ error: `Неизвестный тип сущности: ${type}` });

  const rows = await prisma.entity.findMany({ where: { userId: req.userId!, entityType: type } });
  res.json(rows.map((r: { data: string }) => JSON.parse(r.data)));
});

entitiesRouter.post('/:type', async (req: AuthedRequest, res) => {
  const { type } = req.params;
  if (!isEntityType(type)) return res.status(400).json({ error: `Неизвестный тип сущности: ${type}` });

  const entity = { ...(req.body ?? {}) };
  if (entity.id === undefined || entity.id === null || entity.id === '') {
    entity.id = randomId();
  }
  const now = new Date().toISOString();
  if (!entity.createdAt) entity.createdAt = now;
  entity.updatedAt = now;
  const entityId = String(entity.id);
  const validationError = validateEntity(type, entity);
  if (validationError) return res.status(400).json({ error: validationError });

  const saved = await prisma.entity.upsert({
    where: { userId_entityType_entityId: { userId: req.userId!, entityType: type, entityId } },
    create: { userId: req.userId!, entityType: type, entityId, data: JSON.stringify(entity) },
    update: { data: JSON.stringify(entity) },
  });

  res.status(201).json(JSON.parse(saved.data));
});

entitiesRouter.patch('/:type/:id', async (req: AuthedRequest, res) => {
  const { type, id } = req.params;
  if (!isEntityType(type)) return res.status(400).json({ error: `Неизвестный тип сущности: ${type}` });

  const existing = await prisma.entity.findUnique({
    where: { userId_entityType_entityId: { userId: req.userId!, entityType: type, entityId: id } },
  });
  if (!existing) return res.status(404).json({ error: 'Запись не найдена.' });

  const merged = { ...JSON.parse(existing.data), ...(req.body ?? {}), updatedAt: new Date().toISOString() };
  const validationError = validateEntity(type, merged);
  if (validationError) return res.status(400).json({ error: validationError });
  const saved = await prisma.entity.update({
    where: { userId_entityType_entityId: { userId: req.userId!, entityType: type, entityId: id } },
    data: { data: JSON.stringify(merged) },
  });

  res.json(JSON.parse(saved.data));
});

entitiesRouter.delete('/:type/:id', async (req: AuthedRequest, res) => {
  const { type, id } = req.params;
  if (!isEntityType(type)) return res.status(400).json({ error: `Неизвестный тип сущности: ${type}` });

  try {
    await prisma.entity.delete({
      where: { userId_entityType_entityId: { userId: req.userId!, entityType: type, entityId: id } },
    });
  } catch {
    // уже удалено — считаем идемпотентным успехом
  }
  res.status(204).send();
});

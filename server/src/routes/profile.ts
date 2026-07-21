import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { ENTITY_TYPES } from '../entityTypes.js';

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.patch('/profile', async (req: AuthedRequest, res) => {
  const { name, city } = req.body ?? {};
  const data: { name?: string; city?: string } = {};
  if (typeof name === 'string') data.name = name;
  if (typeof city === 'string') data.city = city;

  const user = await prisma.user.update({ where: { id: req.userId! }, data });
  res.json({ userProfile: { name: user.name, city: user.city, email: user.email } });
});

profileRouter.delete('/account', async (req: AuthedRequest, res) => {
  await prisma.user.delete({ where: { id: req.userId! } });
  res.status(204).send();
});

// Единый запрос при загрузке приложения: профиль + все сущности пользователя,
// в той же форме, в которой их раньше держал defaultState в src/store.tsx.
profileRouter.get('/bootstrap', async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден.' });

  const entities = await prisma.entity.findMany({ where: { userId: req.userId! } });

  const grouped: Record<string, any[]> = {};
  for (const type of ENTITY_TYPES) grouped[type] = [];
  for (const row of entities) {
    if (!grouped[row.entityType]) grouped[row.entityType] = [];
    try {
      grouped[row.entityType].push(JSON.parse(row.data));
    } catch {
      // пропускаем повреждённую запись, не роняем весь bootstrap
    }
  }

  res.json({
    userProfile: { name: user.name, city: user.city, email: user.email },
    learningPlan: { focus: 'Foundations of Python', courses: [] },
    ...grouped,
  });
});

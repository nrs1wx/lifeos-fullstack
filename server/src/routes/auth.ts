import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, signToken, AuthedRequest } from '../middleware/auth.js';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const loginFailures = new Map<string, { attempts: number; lockedUntil?: number }>();

function validateRegistration(name: unknown, email: unknown, password: unknown): string | null {
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) return 'Имя должно содержать от 2 до 60 символов.';
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return 'Введите корректный email.';
  if (typeof password !== 'string' || !PASSWORD_RE.test(password)) return 'Пароль должен содержать минимум 8 символов, букву и цифру.';
  return null;
}

function publicUser(user: { id: string; email: string; name: string; city: string; emailVerified?: boolean }) {
  return { id: user.id, email: user.email, name: user.name, city: user.city, emailVerified: Boolean(user.emailVerified) };
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

async function findUserByEmail(email: string) {
  const [user] = await prisma.$queryRaw<any[]>`
    SELECT "id", "email", "passwordHash", "name", "city", "emailVerified"
    FROM "User"
    WHERE "email" = ${email}
    LIMIT 1
  `;
  return user;
}

async function findUserById(id: string) {
  const [user] = await prisma.$queryRaw<any[]>`
    SELECT "id", "email", "passwordHash", "name", "city", "emailVerified"
    FROM "User"
    WHERE "id" = ${id}
    LIMIT 1
  `;
  return user;
}

authRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body ?? {};
  const validationError = validateRegistration(name, email, password);
  if (validationError) return res.status(400).json({ error: validationError });
  const normalizedEmail = normalizeEmail(email);

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует.' });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        passwordHash,
      },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует.' });
    }
    throw err;
  }

  const token = signToken(user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

authRouter.get('/check-email', async (req, res) => {
  const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Введите корректный email.' });
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  res.json({ available: !existing });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Укажите email и пароль.' });
  }

  const user = await findUserByEmail(normalizeEmail(email));
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль.' });
  }

  const failure = loginFailures.get(user.email);
  if (failure?.lockedUntil && failure.lockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Слишком много попыток. Повторите вход через 15 минут.' });
  }

  const valid = await bcrypt.compare(String(password), user.passwordHash);
  if (!valid) {
    const attempts = (failure?.attempts ?? 0) + 1;
    loginFailures.set(user.email, attempts >= 5 ? { attempts: 0, lockedUntil: Date.now() + 15 * 60 * 1000 } : { attempts });
    return res.status(401).json({ error: 'Неверный email или пароль.' });
  }

  loginFailures.delete(user.email);

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await findUserById(req.userId!);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден.' });
  res.json({ user: publicUser(user) });
});

import bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'crypto';
import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, signToken, AuthedRequest } from '../middleware/auth.js';
import { sendVerificationEmail } from '../email.js';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const loginFailures = new Map<string, { attempts: number; lockedUntil?: number }>();
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;

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

function generateVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

async function issueVerificationCode(user: { id: string; email: string }, enforceRateLimit = true) {
  const [lastCode] = await prisma.$queryRaw<{ id: string; createdAt: Date }[]>`
    SELECT "id", "createdAt"
    FROM "EmailVerificationCode"
    WHERE "userId" = ${user.id} AND "consumedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  if (enforceRateLimit && lastCode && Date.now() - lastCode.createdAt.getTime() < VERIFICATION_RESEND_COOLDOWN_MS) {
    const seconds = Math.ceil((VERIFICATION_RESEND_COOLDOWN_MS - (Date.now() - lastCode.createdAt.getTime())) / 1000);
    const error = new Error(`Please wait ${seconds} seconds before requesting another code.`);
    (error as any).status = 429;
    throw error;
  }

  await prisma.$executeRaw`
    UPDATE "EmailVerificationCode"
    SET "consumedAt" = ${new Date()}
    WHERE "userId" = ${user.id} AND "consumedAt" IS NULL
  `;

  const code = generateVerificationCode();
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.$executeRaw`
    INSERT INTO "EmailVerificationCode" ("id", "userId", "email", "codeHash", "expiresAt")
    VALUES (${randomUUID()}, ${user.id}, ${user.email}, ${codeHash}, ${new Date(Date.now() + VERIFICATION_CODE_TTL_MS)})
  `;

  return sendVerificationEmail(user.email, code);
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

  try {
    const emailResult = await issueVerificationCode(user, false);
    res.status(201).json({
      requiresVerification: true,
      email: user.email,
      user: publicUser(user),
      ...(emailResult.devCode ? { devCode: emailResult.devCode } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not send verification email. Try again later.' });
  }
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

  if (!Boolean(user.emailVerified)) {
    return res.status(403).json({
      code: 'EMAIL_NOT_VERIFIED',
      error: 'Verify your email before logging in.',
      email: user.email,
    });
  }

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

authRouter.post('/verify-email', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || '').trim();
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter the 6-digit code sent to your email.' });
  }

  const user = await findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  if (Boolean(user.emailVerified)) {
    const token = signToken(user.id);
    return res.json({ token, user: publicUser(user) });
  }

  const [verification] = await prisma.$queryRaw<{ id: string; codeHash: string; expiresAt: Date; attempts: number }[]>`
    SELECT "id", "codeHash", "expiresAt", "attempts"
    FROM "EmailVerificationCode"
    WHERE "userId" = ${user.id} AND "consumedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
  if (!verification || verification.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: 'Verification code expired. Request a new code.' });
  }
  if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many incorrect code attempts. Request a new code.' });
  }

  const valid = await bcrypt.compare(code, verification.codeHash);
  if (!valid) {
    await prisma.$executeRaw`
      UPDATE "EmailVerificationCode"
      SET "attempts" = "attempts" + 1
      WHERE "id" = ${verification.id}
    `;
    return res.status(400).json({ error: 'Incorrect verification code.' });
  }

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "EmailVerificationCode"
      SET "consumedAt" = ${new Date()}
      WHERE "id" = ${verification.id}
    `,
    prisma.$executeRaw`
      UPDATE "User"
      SET "emailVerified" = true, "emailVerifiedAt" = ${new Date()}
      WHERE "id" = ${user.id}
    `,
  ]);

  const verifiedUser = await findUserById(user.id);
  const token = signToken(user.id);
  res.json({ token, user: publicUser(verifiedUser) });
});

authRouter.post('/resend-verification', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email.' });

  const user = await findUserByEmail(email);
  if (!user) return res.json({ ok: true });
  if (Boolean(user.emailVerified)) return res.status(400).json({ error: 'Email is already verified. Log in instead.' });

  try {
    const emailResult = await issueVerificationCode(user, true);
    res.json({
      ok: true,
      ...(emailResult.devCode ? { devCode: emailResult.devCode } : {}),
    });
  } catch (err: any) {
    const status = Number(err?.status) || 502;
    res.status(status).json({ error: err?.message || 'Could not send verification email. Try again later.' });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await findUserById(req.userId!);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден.' });
  res.json({ user: publicUser(user) });
});

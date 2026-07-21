import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from './app.js';
import { prisma } from './db.js';

const email = `test-${Date.now()}@lifeos.test`;
describe('auth flow', () => {
  it('registers a user, blocks login until email verification, then returns JWT after verification', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: 'Test User', email, password: 'password123' });
    expect(response.status).toBe(201);
    expect(response.body.requiresVerification).toBe(true);
    expect(response.body.token).toBeUndefined();
    expect(response.body.devCode).toMatch(/^\d{6}$/);

    const blockedLogin = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(blockedLogin.status).toBe(403);
    expect(blockedLogin.body.code).toBe('EMAIL_NOT_VERIFIED');

    const verified = await request(app).post('/api/auth/verify-email').send({ email, code: response.body.devCode });
    expect(verified.status).toBe(200);
    expect(verified.body.token).toEqual(expect.any(String));
    expect(verified.body.user.emailVerified).toBe(true);

    const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
  });
  it('rejects a short password', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: 'Test User', email: `short-${email}`, password: 'abc12' });
    expect(response.status).toBe(400);
  });
});
afterAll(async () => { await prisma.user.deleteMany({ where: { email: { contains: '@lifeos.test' } } }); await prisma.$disconnect(); });

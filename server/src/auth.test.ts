import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from './app.js';
import { prisma } from './db.js';

const email = `test-${Date.now()}@lifeos.test`;
describe('auth flow', () => {
  it('registers a user and returns JWT immediately', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: 'Test User', email, password: 'password123' });
    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));

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

import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { authRouter } from './routes/auth.js';
import { entitiesRouter } from './routes/entities.js';
import { profileRouter } from './routes/profile.js';
import { aiRouter } from './routes/ai.js';
import { learningRouter } from './routes/learning.js';

const FRONTEND_ORIGIN = process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
export const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/entities', entitiesRouter);
app.use('/api/learning', learningRouter);
app.use('/api', profileRouter);
app.use('/api/ai', aiRouter);
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
});

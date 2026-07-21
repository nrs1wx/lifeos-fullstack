import { PrismaClient } from '@prisma/client';

// Один инстанс PrismaClient на всё приложение (рекомендация Prisma для Node/Express).
export const prisma = new PrismaClient();

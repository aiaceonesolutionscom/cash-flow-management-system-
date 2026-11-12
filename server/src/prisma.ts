import { PrismaClient } from '@prisma/client';

process.env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: PrismaClient;
let pool: Pool;

const connectionString = process.env.DATABASE_URL;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Prevent multiple connection pools and clients in development hot-reloads
  const globalWithDb = global as typeof globalThis & {
    prisma?: PrismaClient;
    pool?: Pool;
  };
  if (!globalWithDb.pool) {
    globalWithDb.pool = new Pool({ connectionString });
  }
  if (!globalWithDb.prisma) {
    const adapter = new PrismaPg(globalWithDb.pool);
    globalWithDb.prisma = new PrismaClient({ adapter });
  }
  pool = globalWithDb.pool;
  prisma = globalWithDb.prisma;
}

export { prisma, pool };
export default prisma;

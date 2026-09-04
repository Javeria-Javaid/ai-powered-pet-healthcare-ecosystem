// Direct DB connectivity test - full error output
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  console.log('DATABASE_URL present:', !!connectionString);
  const host = connectionString?.match(/@([^:/?]+)[:/?]/)?.[1];
  console.log('Host:', host);

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });

  // Raw pg test first
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT version()');
    console.log('RAW PG OK:', res.rows[0].version.slice(0, 60));
    const users = await client.query('SELECT email, role FROM "User" LIMIT 5');
    console.log('Users:', JSON.stringify(users.rows));
    client.release();
  } catch (e) {
    console.error('RAW PG ERROR:', e.message);
  }

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.findUnique({ where: { email: 'owner@example.com' } });
    console.log('PRISMA OK - User found:', user ? `${user.email} (${user.role})` : 'NOT FOUND');
  } catch (e) {
    console.error('PRISMA ERROR full message:');
    console.error(JSON.stringify({ msg: e.message?.slice(0, 800), code: e.code, clientVersion: e.clientVersion }, null, 2));
    let cause = e.cause;
    let depth = 0;
    while (cause && depth < 5) {
      console.error(`CAUSE ${depth + 1}:`, cause.message);
      cause = cause.cause;
      depth++;
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();

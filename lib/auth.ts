import { cookies } from 'next/headers';
import { prisma } from './db';
import { User, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

export const SESSION_COOKIE_NAME = 'session_token';
const SESSION_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// Token utilities
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Database-backed session operations
export async function createSession(userId: string, token: string) {
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
  
  return prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });
}

export async function validateSession(token: string): Promise<User | null> {
  const tokenHash = hashSessionToken(token);
  
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  // Check expiration
  if (Date.now() > session.expiresAt.getTime()) {
    // Clean up expired session
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Sliding window expiration: extend session if it has less than 1 hour remaining
  const oneHourLeft = session.expiresAt.getTime() - Date.now() < 60 * 60 * 1000;
  if (oneHourLeft) {
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS) },
    }).catch(() => {});
  }

  return session.user;
}

export async function invalidateSession(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);
  await prisma.session.delete({ where: { tokenHash } }).catch(() => {});
}

// Cookie setting helpers
export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Server-side auth controllers/checkers
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return validateSession(token);
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole | UserRole[]): Promise<User> {
  const user = await requireAuth();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

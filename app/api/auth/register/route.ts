import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, generateSessionToken, createSession, setSessionCookie } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { checkRateLimit, getRateLimitResetSeconds } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 5 registrations per 15 min per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const allowed = checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      const retryAfter = getRateLimitResetSeconds(`register:${ip}`);
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many registration attempts. Please try again later.' } },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email, password, role, firstName, lastName, phone } = body ?? {};

    // Input validation
    if (!email || !password || !role || !firstName || !lastName ||
        typeof email !== 'string' || typeof password !== 'string' ||
        typeof role !== 'string' || typeof firstName !== 'string' || typeof lastName !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields.' } },
        { status: 400 }
      );
    }

    if (email.length > 255 || firstName.length > 100 || lastName.length > 100) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Input values are too long.' } },
        { status: 400 }
      );
    }

    if (!Object.values(UserRole).includes(role as UserRole)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid role provided.' } },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Password must be at least 8 characters long.' } },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Password is too long.' } },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'User with this email already exists.' } },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role as UserRole,
        firstName,
        lastName,
        phone: typeof phone === 'string' ? phone.slice(0, 30) : undefined,
      },
    });

    // Create session and set cookie
    const token = generateSessionToken();
    const session = await createSession(user.id, token);
    await setSessionCookie(token, session.expiresAt);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    }, { status: 201 });

  } catch (err: any) {
    console.error('Registration API Error:', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}

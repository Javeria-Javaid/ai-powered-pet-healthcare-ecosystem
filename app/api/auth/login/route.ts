import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, generateSessionToken, createSession, setSessionCookie } from '@/lib/auth';
import { checkRateLimit, getRateLimitResetSeconds } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 10 attempts per 15 min per IP (brute-force protection)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const allowed = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
    if (!allowed) {
      const retryAfter = getRateLimitResetSeconds(`login:${ip}`);
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Please try again later.' } },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email, password } = body ?? {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Email and password are required.' } },
        { status: 400 }
      );
    }

    if (email.length > 255 || password.length > 128) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid credentials.' } },
        { status: 400 }
      );
    }

    // Lookup user
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' } },
        { status: 401 }
      );
    }

    // Verify password
    const isMatch = await verifyPassword(user.passwordHash, password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' } },
        { status: 401 }
      );
    }

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
    }, { status: 200 });

  } catch (err: any) {
    console.error('Login API Error:', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}

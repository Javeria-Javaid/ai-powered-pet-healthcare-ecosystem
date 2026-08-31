import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, generateSessionToken, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Email and password are required.' } },
        { status: 400 }
      );
    }

    // Lookup user
    const user = await prisma.user.findUnique({ where: { email } });
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

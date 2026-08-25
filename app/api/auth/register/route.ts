import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, generateSessionToken, createSession, setSessionCookie } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const { email, password, role, firstName, lastName, phone } = await req.json();

    // Input validation
    if (!email || !password || !role || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields.' } },
        { status: 400 }
      );
    }

    if (!Object.values(UserRole).includes(role)) {
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
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
        email,
        passwordHash,
        role: role as UserRole,
        firstName,
        lastName,
        phone,
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

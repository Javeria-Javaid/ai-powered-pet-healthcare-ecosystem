import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import * as crypto from 'crypto';
import { checkRateLimit, getRateLimitResetSeconds } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 5 attempts per 15 min per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const allowed = checkRateLimit(`reset-password:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      const retryAfter = getRateLimitResetSeconds(`reset-password:${ip}`);
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again later.' } },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { token, newPassword } = body ?? {};

    if (!token || typeof token !== 'string' || token.length > 128) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Reset token is required.' } },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'New password is required.' } },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Password must be at least 8 characters long.' } },
        { status: 400 }
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Password is too long.' } },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // Generic error for all invalid/expired/consumed token states
    const INVALID_MSG = 'This password reset link is invalid or has expired. Please request a new one.';

    if (!resetToken) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: INVALID_MSG } },
        { status: 400 }
      );
    }

    if (resetToken.consumed) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: INVALID_MSG } },
        { status: 400 }
      );
    }

    if (Date.now() > resetToken.expiresAt.getTime()) {
      // Mark consumed to prevent timing-based reuse attempts
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumed: true },
      });
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: INVALID_MSG } },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    // Atomically: update password, mark token consumed, delete all sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumed: true },
      }),
      prisma.session.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: resetToken.userId,
        action: 'PASSWORD_RESET_COMPLETED',
        entity: 'User',
        entityId: resetToken.userId,
        payload: JSON.stringify({ sessionInvalidated: true }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new password.',
    });
  } catch (err: any) {
    console.error('Reset Password Error:', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to process your request.' } },
      { status: 500 }
    );
  }
}

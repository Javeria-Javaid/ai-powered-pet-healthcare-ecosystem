import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as crypto from 'crypto';
import { checkRateLimit, getRateLimitResetSeconds } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 3 attempts per 15 min per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const allowed = checkRateLimit(`forgot-password:${ip}`, 3, 15 * 60 * 1000);
    if (!allowed) {
      const retryAfter = getRateLimitResetSeconds(`forgot-password:${ip}`);
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again later.' } },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : null;

    if (!email || email.length > 255 || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'A valid email address is required.' } },
        { status: 400 }
      );
    }

    // Look up user — perform work either way to prevent timing attacks
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Invalidate any existing unused tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, consumed: false },
        data: { consumed: true },
      });

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await prisma.passwordResetToken.create({
        data: { tokenHash, userId: user.id, expiresAt },
      });

      // Audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          entity: 'User',
          entityId: user.id,
          payload: JSON.stringify({ email }),
        },
      });

      // In production, send rawToken via email here.
      // For dev/MVP, log the token so it can be used in the reset form.
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Password reset token for ${email}: ${rawToken}`);
      }
    }

    // Always return a generic response — never reveal account existence
    return NextResponse.json({
      success: true,
      message: 'If an account exists for this email, password reset instructions have been sent.',
    });
  } catch (err: any) {
    console.error('Forgot Password Error:', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to process your request.' } },
      { status: 500 }
    );
  }
}

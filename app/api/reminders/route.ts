import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/reminders - The authenticated user's pending reminders,
// earliest due first. Cleared reminders are excluded.
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const reminders = await prisma.reminder.findMany({
      where: { userId: user.id, isCleared: false },
      orderBy: { dueAt: 'asc' },
    });

    return NextResponse.json({ success: true, reminders });
  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in.' } },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An error occurred.' } },
      { status: 500 }
    );
  }
}

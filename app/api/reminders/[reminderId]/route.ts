import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// DELETE /api/reminders/[reminderId] - Clear one of the user's own reminders.
// The reminder is resolved server-side; ownership is checked against the
// session user, never against anything the client sends.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  try {
    const user = await requireAuth();
    const { reminderId } = await params;

    const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
    if (!reminder) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Reminder not found.' } },
        { status: 404 }
      );
    }
    if (reminder.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You can only clear your own reminders.' } },
        { status: 403 }
      );
    }

    await prisma.reminder.delete({ where: { id: reminderId } });

    return NextResponse.json({ success: true });
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

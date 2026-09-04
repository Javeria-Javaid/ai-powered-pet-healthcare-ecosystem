import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await requireAuth();
    const { conversationId } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { veterinarian: true }
    });

    if (!conversation) {
      return NextResponse.json({ success: false, error: { message: 'Conversation not found.' } }, { status: 404 });
    }

    const isOwner = user.role === 'PET_OWNER' && conversation.ownerId === user.id;
    const isVet = user.role === 'VETERINARIAN' && conversation.veterinarian?.userId === user.id;

    if (!isOwner && !isVet) {
      return NextResponse.json({ success: false, error: { message: 'Forbidden' } }, { status: 403 });
    }

    // Mark messages sent by the OTHER party as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: user.id },
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ success: false, error: { message: 'Not logged in.' } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}

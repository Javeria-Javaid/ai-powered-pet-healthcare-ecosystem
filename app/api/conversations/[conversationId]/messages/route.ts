import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
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

    // Authorization
    const isOwner = user.role === 'PET_OWNER' && conversation.ownerId === user.id;
    const isVet = user.role === 'VETERINARIAN' && conversation.veterinarian?.userId === user.id;

    if (!isOwner && !isVet) {
      return NextResponse.json({ success: false, error: { message: 'Forbidden' } }, { status: 403 });
    }

    // Retrieve messages (latest 50)
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } }
    });

    return NextResponse.json({ success: true, messages: messages.reverse() });

  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ success: false, error: { message: 'Not logged in.' } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await requireAuth();
    const { conversationId } = await params;
    const { content } = await req.json();

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ success: false, error: { message: 'Message content cannot be empty.' } }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ success: false, error: { message: 'Message exceeds maximum length.' } }, { status: 400 });
    }

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

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content: content.trim(),
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } }
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({ success: true, message });

  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ success: false, error: { message: 'Not logged in.' } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}

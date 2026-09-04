import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    let conversations: any[] = [];

    if (user.role === 'PET_OWNER') {
      conversations = await prisma.conversation.findMany({
        where: { ownerId: user.id },
        include: {
          pet: true,
          veterinarian: { include: { user: true } },
          appointment: { include: { clinic: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              messages: {
                where: {
                  senderId: { not: user.id },
                  readAt: null,
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
    } else if (user.role === 'VETERINARIAN') {
      // Find vet profile
      const vet = await prisma.veterinarian.findUnique({ where: { userId: user.id } });
      if (!vet) {
        return NextResponse.json({ success: false, error: { message: 'Vet profile not found.' } }, { status: 404 });
      }

      conversations = await prisma.conversation.findMany({
        where: { veterinarianId: vet.id },
        include: {
          pet: true,
          owner: true,
          appointment: { include: { clinic: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              messages: {
                where: {
                  senderId: { not: user.id },
                  readAt: null,
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
    } else {
       return NextResponse.json({ success: false, error: { message: 'Forbidden' } }, { status: 403 });
    }

    const formatted = conversations.map(c => ({
      id: c.id,
      appointmentId: c.appointmentId,
      pet: c.pet,
      veterinarian: c.veterinarian,
      owner: c.owner,
      appointment: c.appointment,
      latestMessage: c.messages[0] || null,
      unreadCount: c._count.messages,
      updatedAt: c.updatedAt
    }));

    return NextResponse.json({ success: true, conversations: formatted });

  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ success: false, error: { message: 'Not logged in.' } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}

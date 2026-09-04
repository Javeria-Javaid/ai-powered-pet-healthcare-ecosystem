import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/appointments/[appointmentId]/conversation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { appointmentId } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        pet: true,
        vet: true,
      }
    });

    if (!appointment) {
      return NextResponse.json({ success: false, error: { message: 'Appointment not found.' } }, { status: 404 });
    }

    // Authorization Check
    const isOwner = user.role === 'PET_OWNER' && appointment.ownerId === user.id;
    const isVet = user.role === 'VETERINARIAN' && appointment.vet.userId === user.id;

    if (!isOwner && !isVet) {
      return NextResponse.json({ success: false, error: { message: 'Forbidden' } }, { status: 403 });
    }

    // Status Check
    const validStatuses = ['CONFIRMED', 'COMPLETED'];
    if (!validStatuses.includes(appointment.status)) {
      return NextResponse.json({ success: false, error: { message: 'Chat is unavailable for this appointment status.' } }, { status: 400 });
    }

    let conversation = await prisma.conversation.findUnique({
      where: { appointmentId }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          appointmentId: appointment.id,
          petId: appointment.petId,
          ownerId: appointment.ownerId,
          veterinarianId: appointment.vetId,
        }
      });
    }

    return NextResponse.json({ success: true, conversation });

  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ success: false, error: { message: 'Not logged in.' } }, { status: 401 });
    }
    console.error('Conversation Error:', err);
    return NextResponse.json({ success: false, error: { message: err.message || 'Internal Server Error' } }, { status: 500 });
  }
}

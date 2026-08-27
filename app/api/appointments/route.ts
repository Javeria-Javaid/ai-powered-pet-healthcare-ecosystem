import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { AppointmentStatus } from '@prisma/client';

// GET /api/appointments - Retrieve appointments sorted by date/time
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    let appointments = [];

    if (user.role === 'PET_OWNER') {
      appointments = await prisma.appointment.findMany({
        where: { ownerId: user.id },
        include: {
          pet: true,
          vet: { include: { user: { select: { firstName: true, lastName: true } } } },
          clinic: true,
        },
        orderBy: { dateTime: 'desc' },
      });
    } else if (user.role === 'VETERINARIAN') {
      const vet = await prisma.veterinarian.findUnique({
        where: { userId: user.id },
      });
      if (!vet) return NextResponse.json({ success: true, appointments: [] });

      appointments = await prisma.appointment.findMany({
        where: { vetId: vet.id },
        include: {
          pet: true,
          owner: { select: { firstName: true, lastName: true, phone: true } },
          clinic: true,
        },
        orderBy: { dateTime: 'desc' },
      });
    } else if (user.role === 'CLINIC_ADMIN') {
      // Clinic admins manage appointments in their clinics.
      // For MVP, return all appointments (or filter by clinic if clinic links are established)
      appointments = await prisma.appointment.findMany({
        include: {
          pet: true,
          vet: { include: { user: { select: { firstName: true, lastName: true } } } },
          owner: { select: { firstName: true, lastName: true } },
          clinic: true,
        },
        orderBy: { dateTime: 'desc' },
      });
    }

    return NextResponse.json({ success: true, appointments });
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

// POST /api/appointments - Create/Request a new appointment
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { petId, vetId, clinicId, dateTime, reason } = await req.json();

    if (!petId || !vetId || !clinicId || !dateTime || !reason) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required booking fields.' } },
        { status: 400 }
      );
    }

    const apptDate = new Date(dateTime);

    // Enforce pet ownership authorization check
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet || pet.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not own this pet.' } },
        { status: 403 }
      );
    }

    // Double-booking prevention check within a transaction block
    const isDoubleBooked = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          vetId,
          dateTime: apptDate,
          status: { in: ['REQUESTED', 'CONFIRMED'] },
        },
      });
      return !!conflict;
    });

    if (isDoubleBooked) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'The veterinarian is already booked for this time slot.' } },
        { status: 409 }
      );
    }

    const newAppt = await prisma.appointment.create({
      data: {
        petId,
        ownerId: user.id,
        vetId,
        clinicId,
        dateTime: apptDate,
        reason,
        status: 'REQUESTED',
      },
      include: {
        pet: true,
        vet: { include: { user: { select: { firstName: true, lastName: true } } } },
        clinic: true,
      },
    });

    return NextResponse.json({ success: true, appointment: newAppt }, { status: 201 });
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

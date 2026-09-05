import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Working hours: 9 AM - 5 PM Asia/Karachi (fixed UTC+5) — the same rule the AI assistant's
// create_booking enforces and check_slots assumes when the AI derives free slots from busy ones.
const WORKING_START_HOUR = 9;
const WORKING_END_HOUR = 17;

// GET /api/appointments/[appointmentId]/slots?date=YYYY-MM-DD
// Reschedule slot options for the appointment's vet. Uses the same availability rules as the
// AI assistant's check_slots tool (past dates rejected, REQUESTED/CONFIRMED bookings and past
// times of today excluded). The vetId is resolved server-side from the appointment record —
// never trusted from the client.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { appointmentId } = await params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || '';

    if (user.role !== 'PET_OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only pet owners can view reschedule slots.' } },
        { status: 403 }
      );
    }

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appt) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } },
        { status: 404 }
      );
    }

    if (appt.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You can only reschedule your own appointments.' } },
        { status: 403 }
      );
    }

    if (appt.status !== 'REQUESTED' && appt.status !== 'CONFIRMED') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Only pending or confirmed appointments can be rescheduled.' } },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'A valid date (YYYY-MM-DD) is required.' } },
        { status: 400 }
      );
    }

    // Karachi wall-clock day boundaries (Karachi is fixed UTC+5, no DST)
    const startOfDay = new Date(`${date}T00:00:00+05:00`);
    const endOfDay = new Date(`${date}T23:59:59.999+05:00`);

    // Same past-date rule as check_slots
    if (endOfDay < new Date()) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'That date has already passed — please choose a future date.' } },
        { status: 400 }
      );
    }

    // Busy slots: the vet's other REQUESTED/CONFIRMED appointments that day. This appointment is
    // excluded, so its current time is not marked busy against itself.
    const booked = await prisma.appointment.findMany({
      where: {
        id: { not: appt.id },
        vetId: appt.vetId,
        dateTime: { gte: startOfDay, lte: endOfDay },
        status: { in: ['REQUESTED', 'CONFIRMED'] },
      },
      select: { dateTime: true },
    });
    const busyTimes = new Set(booked.map(a => a.dateTime.getTime()));

    // Hourly slot grid across working hours, expressed in Karachi wall-clock time
    const now = new Date();
    const slots = [];
    for (let hour = WORKING_START_HOUR; hour < WORKING_END_HOUR; hour++) {
      const iso = `${date}T${String(hour).padStart(2, '0')}:00:00+05:00`;
      const slotDate = new Date(iso);
      slots.push({
        hour,
        label: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: true }).format(slotDate),
        iso,
        available: slotDate > now && !busyTimes.has(slotDate.getTime()),
      });
    }

    return NextResponse.json({ success: true, date, slots });
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

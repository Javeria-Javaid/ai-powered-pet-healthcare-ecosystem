import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { AppointmentStatus } from '@prisma/client';

// PUT /api/appointments/[appointmentId] - Confirm, reject, cancel, or reschedule appointments
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { appointmentId } = await params;
    const body = await req.json();
    const { status, action, dateTime } = body;

    // Reschedule: owner moves an upcoming appointment to a new future time; status resets to REQUESTED
    if (action === 'RESCHEDULE') {
      if (user.role !== 'PET_OWNER') {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Only pet owners can reschedule appointments.' } },
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

      if (!dateTime) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Missing the new appointment date and time.' } },
          { status: 400 }
        );
      }

      const newDate = new Date(dateTime);

      if (isNaN(newDate.getTime())) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid date and time for reschedule.' } },
          { status: 400 }
        );
      }

      if (newDate <= new Date()) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'That date has already passed — please choose a future date.' } },
          { status: 400 }
        );
      }

      // Same working-hours rule as booking creation (9 AM - 5 PM Asia/Karachi), so the times
      // offered by the slots endpoint are exactly the times accepted here
      const karachiHour = parseInt(
        new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false }).format(newDate)
      );
      if (karachiHour < 9 || karachiHour > 16) {
        return NextResponse.json(
          { success: false, error: { code: 'OUTSIDE_WORKING_HOURS', message: 'Requested time is outside working hours (9 AM - 5 PM).' } },
          { status: 400 }
        );
      }

      if (newDate.getTime() === appt.dateTime.getTime()) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'The new time is the same as the current appointment time.' } },
          { status: 400 }
        );
      }

      // Same double-booking rule as booking creation
      const conflict = await prisma.appointment.findFirst({
        where: {
          id: { not: appt.id },
          vetId: appt.vetId,
          dateTime: newDate,
          status: { in: ['REQUESTED', 'CONFIRMED'] },
        },
      });

      if (conflict) {
        return NextResponse.json(
          { success: false, error: { code: 'CONFLICT', message: 'The veterinarian is already booked for this time slot.' } },
          { status: 409 }
        );
      }

      const rescheduledAppt = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { dateTime: newDate, status: 'REQUESTED' },
        include: {
          pet: true,
          vet: { include: { user: { select: { firstName: true, lastName: true } } } },
          clinic: true,
        },
      });

      // Write an Audit Log for tracking security privileges
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'APPOINTMENT_RESCHEDULED',
          entity: 'Appointment',
          entityId: appointmentId,
          payload: JSON.stringify({
            previousDateTime: appt.dateTime.toISOString(),
            newDateTime: newDate.toISOString(),
            previousStatus: appt.status,
            newStatus: 'REQUESTED',
          }),
        },
      });

      return NextResponse.json({ success: true, appointment: rescheduledAppt });
    }

    if (!status || !Object.values(AppointmentStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid appointment status.' } },
        { status: 400 }
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

    // Role-based boundary checks
    let isAuthorized = false;

    if (user.role === 'PET_OWNER') {
      // Pet owners can ONLY cancel their own upcoming appointments
      if (appt.ownerId === user.id && status === 'CANCELLED') {
        isAuthorized = true;
      }
    } else if (user.role === 'VETERINARIAN') {
      // Veterinarians can manage their own appointments (confirm, cancel, reject, complete)
      const vet = await prisma.veterinarian.findUnique({
        where: { userId: user.id },
      });
      if (vet && appt.vetId === vet.id) {
        isAuthorized = true;
      }
    } else if (user.role === 'CLINIC_ADMIN') {
      if (user.clinicId && user.clinicId === appt.clinicId) {
        isAuthorized = true;
      }
    } else if (user.role === 'PLATFORM_ADMIN') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You are not authorized to perform this status transition.' } },
        { status: 403 }
      );
    }

    // Double-booking checks during confirmation
    if (status === 'CONFIRMED') {
      const conflict = await prisma.appointment.findFirst({
        where: {
          id: { not: appt.id },
          vetId: appt.vetId,
          dateTime: appt.dateTime,
          status: 'CONFIRMED',
        },
      });

      if (conflict) {
        return NextResponse.json(
          { success: false, error: { code: 'CONFLICT', message: 'Another confirmed appointment already conflicts with this time slot.' } },
          { status: 409 }
        );
      }
    }

    const updatedAppt = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: status as AppointmentStatus },
      include: {
        pet: true,
        vet: { include: { user: { select: { firstName: true, lastName: true } } } },
        clinic: true,
      },
    });

    // Write an Audit Log for tracking security privileges
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'APPOINTMENT_UPDATED',
        entity: 'Appointment',
        entityId: appointmentId,
        payload: JSON.stringify({ previousStatus: appt.status, newStatus: status }),
      },
    });

    return NextResponse.json({ success: true, appointment: updatedAppt });
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

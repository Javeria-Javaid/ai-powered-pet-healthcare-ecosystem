import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { AppointmentStatus } from '@prisma/client';

// PUT /api/appointments/[appointmentId] - Confirm, reject, or cancel appointments
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { appointmentId } = await params;
    const { status } = await req.json();

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
    } else if (user.role === 'CLINIC_ADMIN' || user.role === 'PLATFORM_ADMIN') {
      // Admins have broad access (can manage clinics/verification status)
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

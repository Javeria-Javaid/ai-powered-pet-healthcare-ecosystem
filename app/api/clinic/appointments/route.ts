import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role !== 'CLINIC_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access Denied.' } },
        { status: 403 }
      );
    }

    if (!user.clinicId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'No clinic associated with this administrator.' } },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'ALL'; // ALL, TODAY, UPCOMING, COMPLETED, CANCELLED, REQUESTED, CONFIRMED

    const where: any = { clinicId: user.clinicId };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    if (filter === 'TODAY') {
      where.dateTime = {
        gte: startOfToday,
        lte: endOfToday,
      };
    } else if (filter === 'UPCOMING') {
      where.dateTime = {
        gt: new Date(),
      };
      where.status = {
        in: ['REQUESTED', 'CONFIRMED'],
      };
    } else if (filter === 'COMPLETED') {
      where.status = 'COMPLETED';
    } else if (filter === 'CANCELLED') {
      where.status = 'CANCELLED';
    } else if (filter === 'REQUESTED') {
      where.status = 'REQUESTED';
    } else if (filter === 'CONFIRMED') {
      where.status = 'CONFIRMED';
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        pet: true,
        owner: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        vet: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        clinic: true,
      },
      orderBy: { dateTime: 'asc' },
    });

    const now = new Date();
    const mappedAppointments = appointments.map(appt => {
      if ((appt.status === 'REQUESTED' || appt.status === 'CONFIRMED') && new Date(appt.dateTime) < now) {
        return { ...appt, status: 'EXPIRED' };
      }
      return appt;
    });

    return NextResponse.json({ success: true, appointments: mappedAppointments });
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

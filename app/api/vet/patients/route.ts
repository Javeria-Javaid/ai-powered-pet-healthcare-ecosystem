import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';

// GET /api/vet/patients - List authorized patients (pets with confirmed appointments with this vet)
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('VETERINARIAN');

    const vet = await prisma.veterinarian.findUnique({
      where: { userId: user.id },
    });

    if (!vet) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Veterinarian profile not found.' } },
        { status: 404 }
      );
    }

    // Retrieve unique pets that have CONFIRMED appointments with this vet
    const appointments = await prisma.appointment.findMany({
      where: {
        vetId: vet.id,
        status: 'CONFIRMED',
      },
      include: {
        pet: {
          include: {
            owner: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { dateTime: 'desc' },
    });

    // De-duplicate pets
    const petMap = new Map();
    appointments.forEach((appt) => {
      if (!petMap.has(appt.petId)) {
        petMap.set(appt.petId, {
          ...appt.pet,
          appointmentDate: appt.dateTime,
        });
      }
    });

    return NextResponse.json({
      success: true,
      patients: Array.from(petMap.values()),
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED' || err.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access Denied.' } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An error occurred.' } },
      { status: 500 }
    );
  }
}

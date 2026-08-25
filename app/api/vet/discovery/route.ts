import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/vet/discovery - Browse/search available veterinarians and clinics
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const vets = await prisma.veterinarian.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        clinics: {
          include: {
            clinic: true,
          },
        },
      },
    });

    const formattedVets = vets.map((vet) => ({
      id: vet.id,
      specialization: vet.specialization,
      licenseNumber: vet.licenseNumber,
      isVerified: vet.isVerified,
      firstName: vet.user.firstName,
      lastName: vet.user.lastName,
      email: vet.user.email,
      phone: vet.user.phone,
      clinics: vet.clinics
        .filter((c) => c.status === 'ACTIVE')
        .map((c) => ({
          id: c.clinic.id,
          name: c.clinic.name,
          address: c.clinic.address,
        })),
    }));

    return NextResponse.json({ success: true, veterinarians: formattedVets });
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

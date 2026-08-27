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

    const associations = await prisma.vetClinicAssociation.findMany({
      where: { clinicId: user.clinicId },
      include: {
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
      },
    });

    const vets = associations.map((assoc) => ({
      id: assoc.vet.id,
      specialization: assoc.vet.specialization,
      licenseNumber: assoc.vet.licenseNumber,
      isVerified: assoc.vet.isVerified,
      firstName: assoc.vet.user.firstName,
      lastName: assoc.vet.user.lastName,
      email: assoc.vet.user.email,
      status: assoc.status,
    }));

    return NextResponse.json({ success: true, vets });
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

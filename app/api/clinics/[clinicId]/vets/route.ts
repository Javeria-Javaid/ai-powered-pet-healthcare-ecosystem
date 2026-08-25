import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/clinics/[clinicId]/vets - List all veterinarians associated with a clinic
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  try {
    await requireAuth();
    const { clinicId } = await params;

    const associations = await prisma.vetClinicAssociation.findMany({
      where: { clinicId },
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

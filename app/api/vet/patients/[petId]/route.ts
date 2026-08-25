import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';

// Helper to check vet authorization to a pet profile
export async function getAuthorizedVetPatient(petId: string, userId: string) {
  const vet = await prisma.veterinarian.findUnique({
    where: { userId },
  });

  if (!vet) {
    return { status: 404, error: 'NOT_FOUND', message: 'Veterinarian profile not found.' };
  }

  // Check for active/confirmed appointments
  const appointment = await prisma.appointment.findFirst({
    where: {
      petId,
      vetId: vet.id,
      status: 'CONFIRMED',
    },
  });

  if (!appointment) {
    return { status: 403, error: 'FORBIDDEN', message: 'No confirmed appointment exists with this pet.' };
  }

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: {
      owner: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
  });

  if (!pet) {
    return { status: 404, error: 'NOT_FOUND', message: 'Pet not found.' };
  }

  return { pet, vet };
}

// GET /api/vet/patients/[petId] - Retrieve authorized patient details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const user = await requireRole('VETERINARIAN');
    const { petId } = await params;

    const authCheck = await getAuthorizedVetPatient(petId, user.id);
    if (authCheck.error) {
      return NextResponse.json(
        { success: false, error: { code: authCheck.error, message: authCheck.message } },
        { status: authCheck.status }
      );
    }

    return NextResponse.json({ success: true, pet: authCheck.pet });
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

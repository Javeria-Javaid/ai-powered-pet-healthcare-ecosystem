import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Helper to check ownership of a pet
async function getAuthorizedPet(petId: string, userId: string) {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
  });

  if (!pet) {
    return { status: 404, error: 'NOT_FOUND', message: 'Pet not found.' };
  }

  if (pet.ownerId !== userId) {
    return { status: 403, error: 'FORBIDDEN', message: 'You do not own this pet.' };
  }

  return { pet };
}

// GET /api/pets/[petId] - Get individual pet detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const user = await requireAuth();
    const { petId } = await params;

    const authCheck = await getAuthorizedPet(petId, user.id);
    if (authCheck.error) {
      return NextResponse.json(
        { success: false, error: { code: authCheck.error, message: authCheck.message } },
        { status: authCheck.status }
      );
    }

    return NextResponse.json({ success: true, pet: authCheck.pet });
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

// PUT /api/pets/[petId] - Update pet details
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const user = await requireAuth();
    const { petId } = await params;
    const { name, species, breed, gender, dateOfBirth, weight } = await req.json();

    const authCheck = await getAuthorizedPet(petId, user.id);
    if (authCheck.error) {
      return NextResponse.json(
        { success: false, error: { code: authCheck.error, message: authCheck.message } },
        { status: authCheck.status }
      );
    }

    if (!name || !species) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Pet name and species are required.' } },
        { status: 400 }
      );
    }

    const updatedPet = await prisma.pet.update({
      where: { id: petId },
      data: {
        name,
        species,
        breed,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        weight: weight ? parseFloat(weight) : null,
      },
    });

    return NextResponse.json({ success: true, pet: updatedPet });
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

// DELETE /api/pets/[petId] - Delete/archive pet profile
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const user = await requireAuth();
    const { petId } = await params;

    const authCheck = await getAuthorizedPet(petId, user.id);
    if (authCheck.error) {
      return NextResponse.json(
        { success: false, error: { code: authCheck.error, message: authCheck.message } },
        { status: authCheck.status }
      );
    }

    await prisma.pet.delete({
      where: { id: petId },
    });

    return NextResponse.json({ success: true, message: 'Pet deleted successfully.' });
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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/pets/[petId]/vaccinations - List a pet's vaccination records
// POST /api/pets/[petId]/vaccinations - Record a vaccination (owner-only)
// Ownership is resolved server-side from the pet record — client-supplied
// petIds are only ever used to look up the pet, never to decide access.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const user = await requireAuth();
    const { petId } = await params;

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Pet not found.' } },
        { status: 404 }
      );
    }
    if (pet.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not own this pet.' } },
        { status: 403 }
      );
    }

    const vaccinations = await prisma.vaccination.findMany({
      where: { petId },
      orderBy: { administeredDate: 'desc' },
    });

    return NextResponse.json({ success: true, vaccinations });
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const user = await requireAuth();
    const { petId } = await params;

    if (user.role !== 'PET_OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only pet owners can record vaccinations.' } },
        { status: 403 }
      );
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Pet not found.' } },
        { status: 404 }
      );
    }
    if (pet.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not own this pet.' } },
        { status: 403 }
      );
    }

    const { vaccineName, administeredDate, dueDate, vetName } = await req.json();

    if (!vaccineName || typeof vaccineName !== 'string' || !vaccineName.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Vaccine name is required.' } },
        { status: 400 }
      );
    }

    if (!administeredDate || isNaN(new Date(administeredDate).getTime())) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'A valid administered date is required.' } },
        { status: 400 }
      );
    }
    const administered = new Date(administeredDate);
    if (administered > new Date()) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Administered date cannot be in the future.' } },
        { status: 400 }
      );
    }

    let due: Date | null = null;
    if (dueDate) {
      if (isNaN(new Date(dueDate).getTime())) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Due date is not a valid date.' } },
          { status: 400 }
        );
      }
      due = new Date(dueDate);
      if (due <= administered) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Due date must be after the administered date.' } },
          { status: 400 }
        );
      }
    }

    const vaccination = await prisma.vaccination.create({
      data: {
        petId,
        vaccineName: vaccineName.trim(),
        administeredDate: administered,
        dueDate: due,
        vetName: vetName && String(vetName).trim() ? String(vetName).trim() : null,
      },
    });

    // When a booster due date exists, schedule a reminder for the owner
    let reminder = null;
    if (due) {
      reminder = await prisma.reminder.create({
        data: {
          userId: user.id,
          title: `Vaccination due: ${vaccination.vaccineName} (${pet.name})`,
          dueAt: due,
        },
      });
    }

    return NextResponse.json({ success: true, vaccination, reminder }, { status: 201 });
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

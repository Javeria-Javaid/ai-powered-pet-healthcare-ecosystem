import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/pets/[petId]/medications - List a pet's medication records
// POST /api/pets/[petId]/medications - Record a medication course (owner-only)
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

    const medications = await prisma.medication.findMany({
      where: { petId },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ success: true, medications });
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Only pet owners can record medications.' } },
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

    const { medicationName, dosage, frequency, startDate, endDate } = await req.json();

    if (!medicationName || typeof medicationName !== 'string' || !medicationName.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Medication name is required.' } },
        { status: 400 }
      );
    }
    if (!dosage || !frequency) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Dosage and frequency are required.' } },
        { status: 400 }
      );
    }

    if (!startDate || isNaN(new Date(startDate).getTime())) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'A valid start date is required.' } },
        { status: 400 }
      );
    }
    const start = new Date(startDate);

    let end: Date | null = null;
    if (endDate) {
      if (isNaN(new Date(endDate).getTime())) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'End date is not a valid date.' } },
          { status: 400 }
        );
      }
      end = new Date(endDate);
      if (end <= start) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'End date must be after the start date.' } },
          { status: 400 }
        );
      }
    }

    const medication = await prisma.medication.create({
      data: {
        petId,
        medicationName: String(medicationName).trim(),
        dosage: String(dosage).trim(),
        frequency: String(frequency).trim(),
        startDate: start,
        endDate: end,
        status: 'ACTIVE',
      },
    });

    // When the course has an end date, remind the owner when it finishes
    let reminder = null;
    if (end) {
      reminder = await prisma.reminder.create({
        data: {
          userId: user.id,
          title: `Medication ends: ${medication.medicationName} (${pet.name})`,
          dueAt: end,
        },
      });
    }

    return NextResponse.json({ success: true, medication, reminder }, { status: 201 });
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

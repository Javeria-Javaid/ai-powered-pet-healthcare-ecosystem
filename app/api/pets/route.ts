import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/pets - Get all pets belonging to authenticated owner
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const pets = await prisma.pet.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, pets });
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

// POST /api/pets - Create a new pet profile
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { name, species, breed, gender, dateOfBirth, weight } = await req.json();

    if (!name || !species) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Pet name and species are required.' } },
        { status: 400 }
      );
    }

    const pet = await prisma.pet.create({
      data: {
        ownerId: user.id,
        name,
        species,
        breed,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        weight: weight ? parseFloat(weight) : null,
      },
    });

    return NextResponse.json({ success: true, pet }, { status: 201 });
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

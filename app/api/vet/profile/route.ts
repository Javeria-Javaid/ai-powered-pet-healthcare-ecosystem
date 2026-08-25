import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';

// GET /api/vet/profile - Get authenticated veterinarian professional profile
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('VETERINARIAN');

    const vetProfile = await prisma.veterinarian.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    if (!vetProfile) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Veterinarian profile not found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      vet: {
        id: vetProfile.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        specialization: vetProfile.specialization,
        licenseNumber: vetProfile.licenseNumber,
        isVerified: vetProfile.isVerified,
        verifiedAt: vetProfile.verifiedAt,
      },
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

// PUT /api/vet/profile - Edit veterinarian professional profile
export async function PUT(req: NextRequest) {
  try {
    const user = await requireRole('VETERINARIAN');
    const { firstName, lastName, phone, specialization } = await req.json();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'First name and last name are required.' } },
        { status: 400 }
      );
    }

    const [updatedUser, updatedVet] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { firstName, lastName, phone },
      }),
      prisma.veterinarian.update({
        where: { userId: user.id },
        data: { specialization },
      }),
    ]);

    return NextResponse.json({
      success: true,
      vet: {
        id: updatedVet.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        specialization: updatedVet.specialization,
        licenseNumber: updatedVet.licenseNumber,
        isVerified: updatedVet.isVerified,
      },
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

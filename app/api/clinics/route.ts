import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/clinics - List clinics associated with the current authenticated user (vet or admin)
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'VETERINARIAN') {
      const vet = await prisma.veterinarian.findUnique({
        where: { userId: user.id },
      });
      if (!vet) {
        return NextResponse.json({ success: true, clinics: [] });
      }

      const associations = await prisma.vetClinicAssociation.findMany({
        where: { vetId: vet.id },
        include: { clinic: true },
      });

      return NextResponse.json({
        success: true,
        clinics: associations.map((assoc) => assoc.clinic),
      });
    }

    // Default: return verified clinics for discovery
    const clinics = await prisma.clinic.findMany({
      where: { isVerified: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, clinics });
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

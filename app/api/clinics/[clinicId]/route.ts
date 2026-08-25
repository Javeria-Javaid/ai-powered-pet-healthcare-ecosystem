import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/clinics/[clinicId] - Fetch clinic details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  try {
    await requireAuth();
    const { clinicId } = await params;

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Clinic not found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, clinic });
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

// PUT /api/clinics/[clinicId] - Edit clinic profile details
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  try {
    const user = await requireAuth();
    const { clinicId } = await params;
    const { name, address, phone } = await req.json();

    if (!name || !address) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Clinic name and address are required.' } },
        { status: 400 }
      );
    }

    // Role boundary checks: Only CLINIC_ADMIN or PLATFORM_ADMIN can edit a clinic
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access Denied.' } },
        { status: 403 }
      );
    }

    const updatedClinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: { name, address, phone },
    });

    return NextResponse.json({ success: true, clinic: updatedClinic });
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

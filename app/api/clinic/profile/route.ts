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

    const clinic = await prisma.clinic.findUnique({
      where: { id: user.clinicId },
    });

    if (!clinic) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Associated clinic not found.' } },
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

export async function PUT(req: NextRequest) {
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

    const { name, address, phone } = await req.json();

    if (!name || !address) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Clinic name and address are required.' } },
        { status: 400 }
      );
    }

    const updatedClinic = await prisma.clinic.update({
      where: { id: user.clinicId },
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

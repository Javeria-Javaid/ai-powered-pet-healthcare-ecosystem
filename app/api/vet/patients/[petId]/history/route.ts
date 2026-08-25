import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { getAuthorizedVetPatient } from '../route';

// GET /api/vet/patients/[petId]/history - Fetch full medical details & records
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

    const [
      medicalRecords,
      vaccinations,
      medications,
      allergies,
      conditions,
      metrics,
    ] = await Promise.all([
      prisma.medicalRecord.findMany({
        where: { petId },
        include: {
          versions: { orderBy: { createdAt: 'desc' } },
          vet: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vaccination.findMany({ where: { petId } }),
      prisma.medication.findMany({ where: { petId } }),
      prisma.allergy.findMany({ where: { petId } }),
      prisma.healthCondition.findMany({ where: { petId } }),
      prisma.healthMetric.findMany({ where: { petId } }),
    ]);

    return NextResponse.json({
      success: true,
      history: {
        medicalRecords,
        vaccinations,
        medications,
        allergies,
        conditions,
        metrics,
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

// POST /api/vet/patients/[petId]/history - Create new medical record entry
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const user = await requireRole('VETERINARIAN');
    const { petId } = await params;
    const { symptoms, diagnosis, treatmentPlan, notes } = await req.json();

    const authCheck = await getAuthorizedVetPatient(petId, user.id);
    if (authCheck.error) {
      return NextResponse.json(
        { success: false, error: { code: authCheck.error, message: authCheck.message } },
        { status: authCheck.status }
      );
    }

    if (!symptoms || !diagnosis || !treatmentPlan) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Symptoms, diagnosis, and treatment plan are required.' } },
        { status: 400 }
      );
    }

    const { vet } = authCheck;
    if (!vet) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Vet record mismatch.' } },
        { status: 404 }
      );
    }

    // Create medical record header and first version
    const newRecord = await prisma.$transaction(async (tx) => {
      const record = await tx.medicalRecord.create({
        data: {
          petId,
          vetId: vet.id,
        },
      });

      const version = await tx.medicalRecordVersion.create({
        data: {
          recordId: record.id,
          editorId: user.id,
          symptoms,
          diagnosis,
          treatmentPlan,
          notes,
          isCurrent: true,
        },
      });

      // Write an Audit Log for security tracing
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'RECORD_REVISION',
          entity: 'MedicalRecord',
          entityId: record.id,
          payload: JSON.stringify({ versionId: version.id, symptoms, diagnosis }),
        },
      });

      return { ...record, versions: [version] };
    });

    return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
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

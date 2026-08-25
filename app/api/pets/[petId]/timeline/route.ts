import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/pets/[petId]/timeline - Fetch chronological timeline events
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const user = await requireAuth();
    const { petId } = await params;

    // Ownership check
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    });

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

    // Retrieve all timeline components
    const [
      medicalRecords,
      vaccinations,
      medications,
      allergies,
      conditions,
      metrics,
      appointments,
    ] = await Promise.all([
      prisma.medicalRecord.findMany({
        where: { petId },
        include: { versions: { where: { isCurrent: true } } },
      }),
      prisma.vaccination.findMany({ where: { petId } }),
      prisma.medication.findMany({ where: { petId } }),
      prisma.allergy.findMany({ where: { petId } }),
      prisma.healthCondition.findMany({ where: { petId } }),
      prisma.healthMetric.findMany({ where: { petId } }),
      prisma.appointment.findMany({ where: { petId } }),
    ]);

    // Format all components into a consistent timeline event list
    const events: any[] = [];

    medicalRecords.forEach((record) => {
      const activeVersion = record.versions[0];
      events.push({
        type: 'MEDICAL_RECORD',
        date: record.createdAt,
        title: activeVersion ? `Diagnosis: ${activeVersion.diagnosis}` : 'Medical Consultation',
        description: activeVersion ? activeVersion.treatmentPlan : '',
        meta: {
          symptoms: activeVersion ? activeVersion.symptoms : '',
          notes: activeVersion ? activeVersion.notes : '',
        },
      });
    });

    vaccinations.forEach((vac) => {
      events.push({
        type: 'VACCINATION',
        date: vac.administeredDate,
        title: `Vaccine: ${vac.vaccineName}`,
        description: vac.dueDate ? `Next booster due: ${vac.dueDate.toLocaleDateString()}` : '',
        meta: { vetName: vac.vetName },
      });
    });

    medications.forEach((med) => {
      events.push({
        type: 'MEDICATION',
        date: med.startDate,
        title: `Medication Started: ${med.medicationName}`,
        description: `Dosage: ${med.dosage} (${med.frequency})`,
        meta: { status: med.status, endDate: med.endDate },
      });
    });

    allergies.forEach((alg) => {
      events.push({
        type: 'ALLERGY',
        date: alg.createdAt,
        title: `Allergy Identified: ${alg.allergen}`,
        description: `Severity: ${alg.severity || 'Normal'}`,
        meta: {},
      });
    });

    conditions.forEach((cond) => {
      events.push({
        type: 'CONDITION',
        date: cond.onsetDate || cond.createdAt,
        title: `Condition Diagnosed: ${cond.name}`,
        description: `Status: ${cond.status}`,
        meta: {},
      });
    });

    metrics.forEach((metric) => {
      events.push({
        type: 'METRIC',
        date: metric.takenAt,
        title: `Metric Update: ${metric.metricType}`,
        description: `${metric.value} ${metric.unit}`,
        meta: {},
      });
    });

    appointments.forEach((appt) => {
      events.push({
        type: 'APPOINTMENT',
        date: appt.dateTime,
        title: `Appointment: ${appt.reason}`,
        description: `Status: ${appt.status}`,
        meta: { vetId: appt.vetId, clinicId: appt.clinicId },
      });
    });

    // Sort chronologically descending (newest first)
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ success: true, timeline: events });
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

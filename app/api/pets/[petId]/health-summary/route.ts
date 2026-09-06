import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getAIProvider, BOOKING_ASSISTANT_PROVIDER } from '@/lib/ai';

// GET /api/pets/[petId]/health-summary — AI Medical History Summary (blueprint Section 19).
// Pulls the pet's structured health history (conditions, consultations, treatments,
// vaccinations, allergies, metrics, appointments) and asks the AI provider for a
// concise overview plus suggested topics to discuss with a veterinarian.
// Stored facts and the AI interpretation are returned separately so the UI can
// label them distinctly. Owner-scoped: identity and ownership are resolved
// server-side; nothing is trusted from the client.

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

// Extract a JSON object from an LLM response that may be wrapped in prose or
// markdown fences. Providers here are plain chat completions without a JSON mode.
function extractJson(raw: string): any | null {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

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
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.vaccination.findMany({ where: { petId }, orderBy: { administeredDate: 'desc' } }),
      prisma.medication.findMany({ where: { petId }, orderBy: { startDate: 'desc' } }),
      prisma.allergy.findMany({ where: { petId } }),
      prisma.healthCondition.findMany({ where: { petId } }),
      prisma.healthMetric.findMany({ where: { petId }, orderBy: { takenAt: 'desc' }, take: 10 }),
      prisma.appointment.findMany({ where: { petId }, orderBy: { dateTime: 'desc' }, take: 10 }),
    ]);

    // ---- Stored facts (rendered verbatim in the UI, clearly labeled as records) ----
    const facts = {
      conditions: conditions.map((c) => ({
        name: c.name,
        status: c.status,
        onsetDate: iso(c.onsetDate),
      })),
      consultations: medicalRecords.map((r) => ({
        date: iso(r.createdAt),
        symptoms: r.versions[0]?.symptoms || '',
        diagnosis: r.versions[0]?.diagnosis || '',
        treatmentPlan: r.versions[0]?.treatmentPlan || '',
        notes: r.versions[0]?.notes || '',
      })),
      medications: medications.map((m) => ({
        name: m.medicationName,
        dosage: m.dosage,
        frequency: m.frequency,
        status: m.status,
        startDate: iso(m.startDate),
        endDate: iso(m.endDate),
      })),
      vaccinations: vaccinations.map((v) => ({
        vaccineName: v.vaccineName,
        administeredDate: iso(v.administeredDate),
        dueDate: iso(v.dueDate),
        vetName: v.vetName,
      })),
      allergies: allergies.map((a) => ({ allergen: a.allergen, severity: a.severity })),
      metrics: metrics.map((m) => ({
        metricType: m.metricType,
        value: Number(m.value),
        unit: m.unit,
        takenAt: iso(m.takenAt),
      })),
      appointments: appointments.map((a) => ({
        dateTime: iso(a.dateTime),
        reason: a.reason,
        status: a.status,
      })),
      counts: {
        conditions: conditions.length,
        consultations: medicalRecords.length,
        medications: medications.length,
        vaccinations: vaccinations.length,
        allergies: allergies.length,
        metrics: metrics.length,
        appointments: appointments.length,
      },
    };

    // ---- AI-generated interpretation (label distinctly in the UI) ----
    let summary: {
      overview: string;
      recurringConcerns: string[];
      observations: string[];
      topicsForVet: string[];
    } | null = null;
    let aiError = '';

    try {
      const ai = getAIProvider();
      const systemPrompt = [
        'You are PETIVA\'s veterinary medical history summarizer.',
        'You receive structured healthcare records for ONE pet and produce a concise health overview the owner can bring to a veterinarian.',
        'Output rules (strict):',
        '- Respond with ONLY a valid JSON object. No markdown, no code fences, no commentary before or after.',
        '- Schema: {"overview": string, "recurringConcerns": string[], "observations": string[], "topicsForVet": string[]}.',
        '- overview: 3-5 plain-language sentences summarizing major previous conditions, recent consultations, treatments, medications, and vaccination status.',
        '- recurringConcerns: short strings for health issues that repeat or persist across records (empty array if none).',
        '- observations: notable data points such as weight trends or resolved conditions (empty array if none).',
        '- topicsForVet: 3-6 concrete questions or topics the owner should raise with their veterinarian, derived from the records (e.g. an approaching vaccination due date, an active condition, a medication ending).',
        '- Use ONLY the provided records. Never invent facts. If a category has no data, reflect that honestly.',
        '- This is NOT a diagnosis and NOT medical advice. Do not recommend medications or treatments. Use phrasing suitable for discussing with a veterinarian.',
        '- Plain text only. No emojis, no special symbols beyond standard punctuation.',
      ].join('\n');

      const userPrompt = [
        `Pet: ${pet.name} (${pet.species}${pet.breed ? `, ${pet.breed}` : ''}${pet.dateOfBirth ? `, born ${new Date(pet.dateOfBirth).toISOString().split('T')[0]}` : ''}).`,
        'Structured healthcare records (JSON):',
        JSON.stringify(facts),
      ].join('\n');

      const response = await ai.generateResponse([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const parsed = extractJson(response.content || '');
      if (
        parsed &&
        typeof parsed.overview === 'string' &&
        Array.isArray(parsed.topicsForVet)
      ) {
        summary = {
          overview: parsed.overview,
          recurringConcerns: Array.isArray(parsed.recurringConcerns) ? parsed.recurringConcerns.map(String) : [],
          observations: Array.isArray(parsed.observations) ? parsed.observations.map(String) : [],
          topicsForVet: parsed.topicsForVet.map(String).filter(Boolean),
        };
      } else {
        aiError = 'The AI response could not be parsed. The stored health facts below are unaffected.';
      }
    } catch (err: any) {
      console.warn('[AI HEALTH SUMMARY] provider failed:', err?.message);
      aiError = 'The AI summary could not be generated right now. The stored health facts below are unaffected.';
    }

    return NextResponse.json({
      success: true,
      pet: { id: pet.id, name: pet.name, species: pet.species, breed: pet.breed },
      facts,
      summary,
      ...(aiError ? { aiError } : {}),
      meta: { provider: BOOKING_ASSISTANT_PROVIDER, generatedAt: new Date().toISOString() },
    });
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

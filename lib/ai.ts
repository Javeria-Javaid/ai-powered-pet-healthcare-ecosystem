import { prisma } from './db';

export interface AIMessageParam {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AIProvider {
  generateResponse(
    messages: AIMessageParam[],
    tools?: any[]
  ): Promise<{
    role: 'assistant';
    content: string;
    toolCalls?: ToolCall[];
  }>;
}

export class OpenRouterProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
  }

  async generateResponse(
    messages: AIMessageParam[],
    tools?: any[]
  ): Promise<{ role: 'assistant'; content: string; toolCalls?: ToolCall[] }> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured in the environment.');
    }

    const payload: any = {
      model: this.model,
      max_tokens: 1000,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      })),
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Pet Healthcare Ecosystem',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error (status ${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    const choice = data.choices?.[0];
    if (!choice || !choice.message) {
      throw new Error('Invalid response structure received from OpenRouter.');
    }

    const msg = choice.message;
    const toolCalls: ToolCall[] = msg.tool_calls ? msg.tool_calls.map((tc: any) => ({
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    })) : undefined;

    return { role: 'assistant', content: msg.content || '', toolCalls };
  }
}

import { GeminiProvider } from './ai/providers/gemini';
import { QwenProvider } from './ai/providers/qwen';
import { GroqProvider } from './ai/providers/groq';

export const BOOKING_ASSISTANT_PROVIDER = process.env.BOOKING_ASSISTANT_PROVIDER || 'groq';

class FallbackProvider {
  private primary = new GroqProvider();
  private secondary = new GeminiProvider();

  async generateResponse(messages: any[], tools?: any[]) {
    try {
      return await this.primary.generateResponse(messages, tools);
    } catch (error) {
      console.warn('[AI] Groq failed, falling back to Gemini:', error);
      return await this.secondary.generateResponse(messages, tools);
    }
  }
}

export function getAIProvider(): any {
  if (BOOKING_ASSISTANT_PROVIDER === 'qwen') return new QwenProvider();
  if (BOOKING_ASSISTANT_PROVIDER === 'gemini') return new GeminiProvider();
  return new FallbackProvider();
}

// Tool definitions for the LLM
export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'getMyPets',
      description: "Get logged in user's pets.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPetHealthTimeline',
      description: 'Get full health history (diagnoses, vaccines, meds, allergies) for a pet.',
      parameters: {
        type: 'object',
        properties: { petId: { type: 'string' } },
        required: ['petId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPetAppointments',
      description: 'Get pet appointment schedules.',
      parameters: {
        type: 'object',
        properties: { petId: { type: 'string' } },
        required: ['petId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_vet',
      description: 'Search veterinarians by specialization.',
      parameters: {
        type: 'object',
        properties: {
          specialization: {
            type: ['string', 'null'],
            description: 'Optional specialization filter. Omit if not specified.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_slots',
      description: 'Check busy slots for a vet on a date.',
      parameters: {
        type: 'object',
        properties: {
          vetId: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
        },
        required: ['vetId', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description: 'Book an appointment.',
      parameters: {
        type: 'object',
        properties: {
          petId: { type: 'string' },
          vetId: { type: 'string' },
          clinicId: { type: 'string' },
          dateTime: { type: 'string', description: 'ISO date' },
          reason: { type: 'string' },
        },
        required: ['petId', 'vetId', 'clinicId', 'dateTime', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description: 'Cancel an existing appointment by its ID.',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string' },
        },
        required: ['appointmentId'],
      },
    },
  },
];

// ── Validation helpers ─────────────────────────────────────────────────────────

/** Validate that a string looks like a plausible UUID (not empty, not too long) */
function validateId(value: unknown, fieldName: string): string {
  if (!value || typeof value !== 'string') {
    throw new Error(`Missing or invalid parameter: ${fieldName}`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 36) {
    throw new Error(`Invalid ${fieldName}: value out of expected length range.`);
  }
  // Basic UUID or cuid format check (alphanumeric, hyphens)
  if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
    throw new Error(`Invalid ${fieldName}: unexpected characters detected.`);
  }
  return trimmed;
}

/** Verify that a pet belongs to the given user */
async function verifyPetOwnership(petId: string, userId: string) {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { ownerId: true },
  });
  if (!pet) throw new Error('Pet not found.');
  if (pet.ownerId !== userId) throw new Error('Access Denied: You do not own this pet.');
}

/** Verify that a vet exists (used in create_booking to prevent phantom IDs) */
async function verifyVetExists(vetId: string): Promise<void> {
  const vet = await prisma.veterinarian.findUnique({ where: { id: vetId }, select: { id: true } });
  if (!vet) throw new Error('Veterinarian not found.');
}

/** Verify that a clinic exists and is associated with the given vet */
async function verifyClinicForVet(clinicId: string, vetId: string): Promise<void> {
  const assoc = await prisma.vetClinicAssociation.findFirst({
    where: { clinicId, vetId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!assoc) throw new Error('Clinic not found or not associated with the selected veterinarian.');
}

// ── Tool executor ─────────────────────────────────────────────────────────────

export async function executeTool(name: string, argsStr: string, userId: string): Promise<string> {
  let args: any;
  try {
    args = JSON.parse(argsStr || '{}');
  } catch {
    throw new Error(`Invalid JSON arguments for tool ${name}`);
  }

  switch (name) {
    case 'getMyPets': {
      const pets = await prisma.pet.findMany({
        where: { ownerId: userId },
        select: { id: true, name: true, species: true, breed: true },
      });
      return JSON.stringify({ success: true, pets });
    }

    case 'getPetProfile': {
      const petId = validateId(args.petId, 'petId');
      await verifyPetOwnership(petId, userId);
      const pet = await prisma.pet.findUnique({ where: { id: petId } });
      return JSON.stringify({ success: true, pet });
    }

    case 'getPetHealthTimeline': {
      const petId = validateId(args.petId, 'petId');
      await verifyPetOwnership(petId, userId);

      const [records, vaccinations, medications, allergies, conditions, metrics, appointments] = await Promise.all([
        prisma.medicalRecord.findMany({ where: { petId }, include: { versions: { where: { isCurrent: true } } } }),
        prisma.vaccination.findMany({ where: { petId } }),
        prisma.medication.findMany({ where: { petId } }),
        prisma.allergy.findMany({ where: { petId } }),
        prisma.healthCondition.findMany({ where: { petId } }),
        prisma.healthMetric.findMany({ where: { petId } }),
        prisma.appointment.findMany({ where: { petId } }),
      ]);

      return JSON.stringify({
        success: true,
        timeline: { records, vaccinations, medications, allergies, conditions, metrics, appointments },
      });
    }

    case 'getPetVaccinations': {
      const petId = validateId(args.petId, 'petId');
      await verifyPetOwnership(petId, userId);
      const vaccinations = await prisma.vaccination.findMany({ where: { petId } });
      return JSON.stringify({ success: true, vaccinations });
    }

    case 'getPetMedications': {
      const petId = validateId(args.petId, 'petId');
      await verifyPetOwnership(petId, userId);
      const medications = await prisma.medication.findMany({ where: { petId } });
      return JSON.stringify({ success: true, medications });
    }

    case 'getPetAllergies': {
      const petId = validateId(args.petId, 'petId');
      await verifyPetOwnership(petId, userId);
      const allergies = await prisma.allergy.findMany({ where: { petId } });
      return JSON.stringify({ success: true, allergies });
    }

    case 'getPetAppointments': {
      const petId = validateId(args.petId, 'petId');
      await verifyPetOwnership(petId, userId);
      const appointments = await prisma.appointment.findMany({
        where: { petId },
        select: {
          id: true, dateTime: true, status: true, reason: true,
          vet: { select: { user: { select: { firstName: true, lastName: true } } } },
          clinic: { select: { name: true } },
        },
      });
      const mapped = appointments.map(a => ({
        id: a.id, dateTime: a.dateTime, status: a.status, reason: a.reason,
        vet: `${a.vet.user.firstName} ${a.vet.user.lastName}`, clinic: a.clinic.name,
      }));
      return JSON.stringify({ success: true, appointments: mapped });
    }

    case 'find_vet': {
      // Validate optional specialization — limit length, strip dangerous chars
      let specialization: string | undefined;
      if (typeof args.specialization === 'string') {
        const cleaned = args.specialization.slice(0, 100).replace(/[^a-zA-Z0-9 \-]/g, '').trim();
        if (cleaned.length > 0) specialization = cleaned;
      }

      const vets = await prisma.veterinarian.findMany({
        where: specialization ? { specialization: { contains: specialization, mode: 'insensitive' } } : {},
        include: {
          user: { select: { firstName: true, lastName: true } },
          clinics: { where: { status: 'ACTIVE' }, include: { clinic: { select: { id: true, name: true } } } },
        },
      });
      const mappedVets = vets.map(v => ({
        id: v.id,
        name: `${v.user.firstName} ${v.user.lastName}`,
        specialization: v.specialization,
        clinicId: v.clinics?.[0]?.clinicId || null,
        clinicName: v.clinics?.[0]?.clinic?.name || null,
      }));
      return JSON.stringify({ success: true, veterinarians: mappedVets });
    }

    case 'check_slots': {
      const vetId = validateId(args.vetId, 'vetId');
      if (!args.date || typeof args.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
        throw new Error('Missing or invalid parameter: date (expected YYYY-MM-DD)');
      }

      // Verify vet exists
      await verifyVetExists(vetId);

      const now = new Date();
      const startOfDay = new Date(args.date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(args.date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      if (endOfDay < now) {
        return JSON.stringify({ success: false, error: 'PAST_DATE', message: 'The requested date is in the past. Please select a future date.' });
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          vetId,
          dateTime: { gte: startOfDay, lte: endOfDay },
          status: { in: ['REQUESTED', 'CONFIRMED'] },
        },
        select: { dateTime: true },
      });

      const busySlots = appointments.map(a => a.dateTime);

      // Block past hours for today
      for (let i = 0; i < 24; i++) {
        const slotTime = new Date(startOfDay);
        slotTime.setUTCHours(i);
        if (slotTime <= now) busySlots.push(slotTime);
      }

      return JSON.stringify({ success: true, busySlots });
    }

    case 'create_booking': {
      const petId = validateId(args.petId, 'petId');
      const vetId = validateId(args.vetId, 'vetId');
      const clinicId = validateId(args.clinicId, 'clinicId');

      if (!args.dateTime || typeof args.dateTime !== 'string') {
        throw new Error('Missing parameter: dateTime');
      }
      if (!args.reason || typeof args.reason !== 'string') {
        throw new Error('Missing parameter: reason');
      }

      const reason = args.reason.slice(0, 500); // Cap reason length

      // Server-side ownership + existence checks — never trust model-supplied IDs blindly
      await verifyPetOwnership(petId, userId);
      await verifyVetExists(vetId);
      await verifyClinicForVet(clinicId, vetId);

      const apptDate = new Date(args.dateTime);
      if (isNaN(apptDate.getTime())) {
        return JSON.stringify({ success: false, error: 'INVALID_DATE', message: 'Invalid date/time format.' });
      }

      if (apptDate <= new Date()) {
        return JSON.stringify({ success: false, error: 'PAST_DATE', message: 'That date has already passed — please choose a future date.' });
      }

      // Working hours validation (9 AM–5 PM Karachi)
      const karachiTime = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false }).format(apptDate);
      const hour = parseInt(karachiTime);
      if (hour < 9 || hour > 16) {
        return JSON.stringify({ success: false, error: 'OUTSIDE_WORKING_HOURS', message: 'Requested time is outside working hours (9 AM - 5 PM).' });
      }

      // Double-booking check
      const conflict = await prisma.appointment.findFirst({
        where: {
          vetId,
          dateTime: apptDate,
          status: { in: ['REQUESTED', 'CONFIRMED'] },
        },
      });
      if (conflict) {
        return JSON.stringify({ success: false, error: 'VET_DOUBLE_BOOKED', message: 'The vet is busy at this slot.' });
      }

      const appt = await prisma.appointment.create({
        data: { petId, ownerId: userId, vetId, clinicId, dateTime: apptDate, reason, status: 'REQUESTED' },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'APPOINTMENT_CREATED',
          entity: 'Appointment',
          entityId: appt.id,
          payload: JSON.stringify({ petId, vetId, clinicId, dateTime: apptDate.toISOString() }),
        },
      });

      return JSON.stringify({ success: true, appointment: appt });
    }

    case 'cancel_appointment': {
      const appointmentId = validateId(args.appointmentId, 'appointmentId');

      const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appt) {
        return JSON.stringify({ success: false, error: 'NOT_FOUND', message: 'Appointment not found.' });
      }

      // Server-side ownership check — model cannot bypass this
      if (appt.ownerId !== userId) {
        return JSON.stringify({ success: false, error: 'FORBIDDEN', message: 'You are not authorized to cancel this appointment.' });
      }

      if (appt.status === 'CANCELLED') {
        return JSON.stringify({ success: false, error: 'ALREADY_CANCELLED', message: 'Appointment is already cancelled.' });
      }

      if (appt.status === 'COMPLETED' || appt.status === 'NO_SHOW') {
        return JSON.stringify({ success: false, error: 'INVALID_TRANSITION', message: 'Cannot cancel a completed or no-show appointment.' });
      }

      const updatedAppt = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'APPOINTMENT_UPDATED',
          entity: 'Appointment',
          entityId: appointmentId,
          payload: JSON.stringify({ previousStatus: appt.status, newStatus: 'CANCELLED' }),
        },
      });

      return JSON.stringify({ success: true, appointment: updatedAppt });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

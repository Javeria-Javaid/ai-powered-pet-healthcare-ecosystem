import { requireAuth } from './auth';
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
        'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
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

    return {
      role: 'assistant',
      content: msg.content || '',
      toolCalls,
    };
  }
}

import { GeminiProvider } from './ai/providers/gemini';
import { QwenProvider } from './ai/providers/qwen';
import { GroqProvider } from './ai/providers/groq';

// Config flag to swap between Qwen, Groq, and Gemini
export const BOOKING_ASSISTANT_PROVIDER = process.env.BOOKING_ASSISTANT_PROVIDER || 'groq';

class FallbackProvider {
  private primary = new GroqProvider();
  private secondary = new GeminiProvider();

  async generateResponse(messages: any[], tools?: any[]) {
    try {
      return await this.primary.generateResponse(messages, tools);
    } catch (error) {
      console.warn('[AI DIAGNOSTIC] Groq failed, falling back to Gemini:', error);
      return await this.secondary.generateResponse(messages, tools);
    }
  }
}

// Get the active provider instance
export function getAIProvider(): any {
  console.log(`[AI DIAGNOSTIC] Serving assistant request with provider: ${BOOKING_ASSISTANT_PROVIDER.toUpperCase()}`);
  if (BOOKING_ASSISTANT_PROVIDER === 'qwen') {
    return new QwenProvider();
  }
  if (BOOKING_ASSISTANT_PROVIDER === 'gemini') {
    return new GeminiProvider();
  }
  // Default to FallbackProvider for groq to handle rate limits gracefully
  return new FallbackProvider();
}

// Define the tool descriptions for the LLM
export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'getMyPets',
      description: 'Get logged in user\'s pets.',
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
      description: 'Search veterinarians by specialization (e.g. General, Cardiology).',
      parameters: {
        type: 'object',
        properties: {
          specialization: {
            type: ['string', 'null'],
            description: 'Optional. Only include this if the user specifically requests a specialty (e.g. surgery, dermatology). Omit this parameter entirely if not specified \u2014 do not pass null.',
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

// Helper to verify that a pet belongs to the currently logged in owner
async function verifyPetOwnership(petId: string, userId: string) {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { ownerId: true },
  });
  if (!pet) {
    throw new Error('Pet not found.');
  }
  if (pet.ownerId !== userId) {
    throw new Error('Access Denied: You do not own this pet.');
  }
}

// Execute a tool requested by the AI
export async function executeTool(name: string, argsStr: string, userId: string): Promise<string> {
  const args = JSON.parse(argsStr || '{}');
  console.log(`[AI DIAGNOSTIC - TOOL START] Name: ${name}, Args:`, args);

  switch (name) {
    case 'getMyPets': {
      const pets = await prisma.pet.findMany({
        where: { ownerId: userId },
        select: { id: true, name: true, species: true, breed: true }
      });
      return JSON.stringify({ success: true, pets });
    }
    case 'getPetProfile': {
      const { petId } = args;
      if (!petId) throw new Error('Missing parameter: petId');
      await verifyPetOwnership(petId, userId);
      const pet = await prisma.pet.findUnique({ where: { id: petId } });
      return JSON.stringify({ success: true, pet });
    }
    case 'getPetHealthTimeline': {
      const { petId } = args;
      if (!petId) throw new Error('Missing parameter: petId');
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
        timeline: { records, vaccinations, medications, allergies, conditions, metrics, appointments }
      });
    }
    case 'getPetVaccinations': {
      const { petId } = args;
      if (!petId) throw new Error('Missing parameter: petId');
      await verifyPetOwnership(petId, userId);
      const vaccinations = await prisma.vaccination.findMany({ where: { petId } });
      return JSON.stringify({ success: true, vaccinations });
    }
    case 'getPetMedications': {
      const { petId } = args;
      if (!petId) throw new Error('Missing parameter: petId');
      await verifyPetOwnership(petId, userId);
      const medications = await prisma.medication.findMany({ where: { petId } });
      return JSON.stringify({ success: true, medications });
    }
    case 'getPetAllergies': {
      const { petId } = args;
      if (!petId) throw new Error('Missing parameter: petId');
      await verifyPetOwnership(petId, userId);
      const allergies = await prisma.allergy.findMany({ where: { petId } });
      return JSON.stringify({ success: true, allergies });
    }
    case 'getPetAppointments': {
      const { petId } = args;
      if (!petId) throw new Error('Missing parameter: petId');
      await verifyPetOwnership(petId, userId);
      const appointments = await prisma.appointment.findMany({ 
        where: { petId },
        select: {
           id: true, dateTime: true, status: true, reason: true,
           vet: { select: { user: { select: { firstName: true, lastName: true } } } },
           clinic: { select: { name: true } }
        }
      });
      const mapped = appointments.map(a => ({
        id: a.id, dateTime: a.dateTime, status: a.status, reason: a.reason,
        vet: `${a.vet.user.firstName} ${a.vet.user.lastName}`, clinic: a.clinic.name
      }));
      return JSON.stringify({ success: true, appointments: mapped });
    }
    case 'find_vet': {
      const { specialization } = args;
      const vets = await prisma.veterinarian.findMany({
        where: specialization ? { specialization: { contains: specialization, mode: 'insensitive' } } : {},
        include: {
          user: { select: { firstName: true, lastName: true } },
          clinics: { include: { clinic: { select: { id: true, name: true } } } }
        }
      });
      const mappedVets = vets.map(v => ({
        id: v.id,
        name: `${v.user.firstName} ${v.user.lastName}`,
        specialization: v.specialization,
        clinicId: v.clinics?.[0]?.clinicId || null
      }));
      return JSON.stringify({ success: true, veterinarians: mappedVets });
    }
    case 'check_slots': {
      const { vetId, date } = args;
      if (!vetId || !date) throw new Error('Missing parameter: vetId or date');
      
      const targetDate = new Date(date);
      const now = new Date();
      
      // We will still allow the current day, but we'll pad past hours as busy
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      if (endOfDay < now) {
        return JSON.stringify({ success: false, error: 'PAST_DATE', message: 'The requested date is in the past. Please select a future date.' });
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          vetId,
          dateTime: { gte: startOfDay, lte: endOfDay },
          status: { in: ['REQUESTED', 'CONFIRMED'] }
        },
        select: { dateTime: true }
      });
      
      const busySlots = appointments.map(a => a.dateTime);
      
      // Block past hours for today
      for (let i = 0; i < 24; i++) {
        const slotTime = new Date(startOfDay);
        slotTime.setUTCHours(i);
        if (slotTime <= now) {
          busySlots.push(slotTime);
        }
      }

      return JSON.stringify({ success: true, busySlots });
    }
    case 'create_booking': {
      const { petId, vetId, clinicId, dateTime, reason } = args;
      if (!petId || !vetId || !clinicId || !dateTime || !reason) {
        throw new Error('Missing required booking parameters');
      }
      await verifyPetOwnership(petId, userId);
      const apptDate = new Date(dateTime);

      if (apptDate <= new Date()) {
        return JSON.stringify({ success: false, error: 'PAST_DATE', message: 'That date has already passed — please choose a future date.' });
      }

      // Working hours validation
      const karachiTime = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false }).format(apptDate);
      const hour = parseInt(karachiTime);
      if (hour < 9 || hour > 16) { 
        return JSON.stringify({ success: false, error: 'OUTSIDE_WORKING_HOURS', message: 'Requested time is outside working hours (9 AM - 5 PM).' });
      }

      // Check double booking
      const conflict = await prisma.appointment.findFirst({
        where: {
          vetId,
          dateTime: apptDate,
          status: { in: ['REQUESTED', 'CONFIRMED'] }
        }
      });
      if (conflict) {
        return JSON.stringify({ success: false, error: 'VET_DOUBLE_BOOKED', message: 'The vet is busy at this slot.' });
      }

      const appt = await prisma.appointment.create({
        data: {
          petId,
          ownerId: userId,
          vetId,
          clinicId,
          dateTime: apptDate,
          reason,
          status: 'REQUESTED'
        }
      });
      return JSON.stringify({ success: true, appointment: appt });
    }
    case 'cancel_appointment': {
      const { appointmentId } = args;
      if (!appointmentId) throw new Error('Missing parameter: appointmentId');
      
      const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appt) {
        return JSON.stringify({ success: false, error: 'NOT_FOUND', message: 'Appointment not found.' });
      }
      
      if (appt.ownerId !== userId) {
        return JSON.stringify({ success: false, error: 'FORBIDDEN', message: 'You are not authorized to cancel this appointment.' });
      }
      
      if (appt.status === 'CANCELLED') {
        return JSON.stringify({ success: false, error: 'ALREADY_CANCELLED', message: 'Appointment is already cancelled.' });
      }

      const updatedAppt = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' }
      });
      
      // Audit Log
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

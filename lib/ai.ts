import { requireAuth } from './auth';
import { prisma } from './db';

export interface AIMessageParam {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
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

    const data = await res.json();
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

// Get the active provider instance
export function getAIProvider(): AIProvider {
  return new OpenRouterProvider();
}

// Define the tool descriptions for the LLM
export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'getMyPets',
      description: 'Retrieve a list of all pets belonging to the currently logged in owner.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPetProfile',
      description: 'Get details about a specific pet.',
      parameters: {
        type: 'object',
        properties: {
          petId: { type: 'string', description: 'The unique ID of the pet.' },
        },
        required: ['petId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPetHealthTimeline',
      description: 'Get the health history timeline including diagnoses, vaccinations, etc., for a specific pet.',
      parameters: {
        type: 'object',
        properties: {
          petId: { type: 'string', description: 'The unique ID of the pet.' },
        },
        required: ['petId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPetVaccinations',
      description: 'Retrieve all vaccination history logs for a specific pet.',
      parameters: {
        type: 'object',
        properties: {
          petId: { type: 'string', description: 'The unique ID of the pet.' },
        },
        required: ['petId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPetMedications',
      description: 'Retrieve current and historical medications prescribed to a specific pet.',
      parameters: {
        type: 'object',
        properties: {
          petId: { type: 'string', description: 'The unique ID of the pet.' },
        },
        required: ['petId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPetAllergies',
      description: 'Retrieve all identified allergies for a specific pet.',
      parameters: {
        type: 'object',
        properties: {
          petId: { type: 'string', description: 'The unique ID of the pet.' },
        },
        required: ['petId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPetAppointments',
      description: 'Retrieve all upcoming and past appointment schedules for a specific pet.',
      parameters: {
        type: 'object',
        properties: {
          petId: { type: 'string', description: 'The unique ID of the pet.' },
        },
        required: ['petId'],
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

  switch (name) {
    case 'getMyPets': {
      const pets = await prisma.pet.findMany({
        where: { ownerId: userId },
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
      const appointments = await prisma.appointment.findMany({ where: { petId } });
      return JSON.stringify({ success: true, appointments });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

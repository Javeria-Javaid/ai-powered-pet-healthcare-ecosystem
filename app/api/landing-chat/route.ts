import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_MODELS = [
  'openrouter/free',
  'deepseek/deepseek-r1:free',
  'meta-llama/llama-3.3-70b-instruct:free'
];

async function callOpenRouter(messages: any[], modelIndex: number = 0): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured in the environment.');
  }

  const model = FALLBACK_MODELS[modelIndex] || 'openrouter/free';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'PETIVA Public Landing Assistant',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 500,
        messages: messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenRouter.');
    }
    return content;
  } catch (err: any) {
    console.warn(`Failed calling OpenRouter with model ${model}:`, err.message);
    if (modelIndex < FALLBACK_MODELS.length - 1) {
      console.log(`Trying fallback model index ${modelIndex + 1}...`);
      return callOpenRouter(messages, modelIndex + 1);
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required.' },
        { status: 400 }
      );
    }

    const systemPrompt = {
      role: 'system',
      content: `You are PETIVA's Public Assistant. PETIVA is an AI-powered pet healthcare ecosystem connecting Pet Owners, Veterinarians, and Veterinary Clinics.
You must ONLY answer general questions about the platform, its features, pricing, sign up instructions, and navigation.
You do NOT have access to user-specific data (no pet profiles, appointments, or medical records).
If the user asks about specific pets, medical histories, or appointments, politely instruct them to sign in or sign up first.
Keep your answers brief, friendly, and helpful.`,
    };

    const fullMessages = [systemPrompt, ...messages];
    const assistantResponse = await callOpenRouter(fullMessages);

    return NextResponse.json({
      success: true,
      message: assistantResponse,
    });
  } catch (err: any) {
    console.error('Landing chat error:', err.message);
    try {
      console.log('OpenRouter chain exhausted. Triggering Gemini fallback...');
      const { GeminiProvider } = require('@/lib/ai/providers/gemini');
      const gemini = new GeminiProvider();
      const systemPrompt = {
        role: 'system',
        content: `You are PETIVA's Public Assistant. PETIVA is an AI-powered pet healthcare ecosystem connecting Pet Owners, Veterinarians, and Veterinary Clinics.
You must ONLY answer general questions about the platform, its features, pricing, sign up instructions, and navigation.
You do NOT have access to user-specific data (no pet profiles, appointments, or medical records).
If the user asks about specific pets, medical histories, or appointments, politely instruct them to sign in or sign up first.
Keep your answers brief, friendly, and helpful.`,
      };
      const { messages } = await req.json();
      const fullMessages = [systemPrompt, ...messages];
      const geminiRes = await gemini.generateResponse(fullMessages);
      return NextResponse.json({
        success: true,
        message: geminiRes.content,
      });
    } catch (geminiErr: any) {
      console.error('Gemini fallback failed:', geminiErr.message);
      return NextResponse.json({
        success: true,
        message: 'Assistant is temporarily busy, please try again shortly.'
      });
    }
  }
}

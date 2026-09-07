import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitResetSeconds } from '@/lib/rate-limit';
import { GeminiProvider } from '@/lib/ai/providers/gemini';

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
    // Rate limit: max 10 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `landing-chat:${ip}`;
    if (!checkRateLimit(rateLimitKey, 10, 60 * 1000)) {
      const retryAfter = getRateLimitResetSeconds(rateLimitKey);
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a moment before trying again.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required.' },
        { status: 400 }
      );
    }

    if (messages.length > 15) {
      return NextResponse.json(
        { success: false, error: 'Too many messages in history.' },
        { status: 400 }
      );
    }

    // Validate each message structure and length
    for (const msg of messages) {
      if (!msg || typeof msg !== 'object' || typeof msg.content !== 'string' || !['user', 'assistant'].includes(msg.role)) {
        return NextResponse.json(
          { success: false, error: 'Invalid message structure.' },
          { status: 400 }
        );
      }
      if (msg.content.length > 1000) {
        return NextResponse.json(
          { success: false, error: 'Message content exceeds maximum allowed length of 1000 characters.' },
          { status: 400 }
        );
      }
    }

    const systemPrompt = {
      role: 'system',
      content: `You are PETIVA's Public Assistant. PETIVA is an AI-powered pet healthcare ecosystem connecting Pet Owners, Veterinarians, and Veterinary Clinics.
You must ONLY answer general questions about the platform, its features, pricing, sign up instructions, and navigation.
You do NOT have access to user-specific data (no pet profiles, appointments, or medical records).
If the user asks about specific pets, medical histories, or appointments, politely instruct them to sign in or sign up first.
Keep your answers brief, friendly, and helpful.
Do not use emojis in responses.`,
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
      const gemini = new GeminiProvider();
      const systemPrompt = {
        role: 'system',
        content: `You are PETIVA's Public Assistant. PETIVA is an AI-powered pet healthcare ecosystem connecting Pet Owners, Veterinarians, and Veterinary Clinics.
You must ONLY answer general questions about the platform, its features, pricing, sign up instructions, and navigation.
You do NOT have access to user-specific data (no pet profiles, appointments, or medical records).
If the user asks about specific pets, medical histories, or appointments, politely instruct them to sign in or sign up first.
Keep your answers brief, friendly, and helpful.
Do not use emojis in responses.`,
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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getAIProvider, AI_TOOLS, executeTool, AIMessageParam } from '@/lib/ai';

function sanitizeForWin1252(str: string): string {
  if (!str) return str;
  return str.replace(/[\uD800-\uDFFF].|[^\x00-\x7F\u0080-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u20AC]/g, '');
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const petId = searchParams.get('petId');

    if (!petId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'petId is required.' } },
        { status: 400 }
      );
    }

    // Verify ownership of the pet
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet || pet.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access Denied.' } },
        { status: 403 }
      );
    }

    // Load the latest conversation for this user and pet
    const conversation = await prisma.aIConversation.findFirst({
      where: { userId: user.id, petId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ success: true, conversationId: '', messages: [] });
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      messages: conversation.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

  } catch (err: any) {
    console.error('AI Chat GET Error:', err.message);
    if (err.message === 'UNAUTHENTICATED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in.' } },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { conversationId, petId, message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Message content is required.' } },
        { status: 400 }
      );
    }

    let activeConversationId = conversationId;
    let activePetId = petId;

    // Resolve or initialize the conversation header
    if (!activeConversationId) {
      if (!activePetId) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'petId is required to start a new conversation.' } },
          { status: 400 }
        );
      }

      // Enforce owner check on petId to ensure tenant separation
      const pet = await prisma.pet.findUnique({ where: { id: activePetId } });
      if (!pet || pet.ownerId !== user.id) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Access Denied.' } },
          { status: 403 }
        );
      }

      const newConversation = await prisma.aIConversation.create({
        data: {
          userId: user.id,
          petId: activePetId,
        },
      });
      activeConversationId = newConversation.id;
    } else {
      // Validate that the conversation belongs to the logged-in user
      const conversation = await prisma.aIConversation.findUnique({
        where: { id: activeConversationId },
      });
      if (!conversation) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found.' } },
          { status: 404 }
        );
      }
      if (conversation.userId !== user.id) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Access Denied.' } },
          { status: 403 }
        );
      }
      activePetId = conversation.petId;
    }

    // Save the incoming user query in the database
    await prisma.aIMessage.create({
      data: {
        conversationId: activeConversationId,
        role: 'user',
        content: sanitizeForWin1252(message),
      },
    });

    // Retrieve conversation history (limit to most recent 20 messages to prevent context bloat)
    const pastMessages = await prisma.aIMessage.findMany({
      where: { conversationId: activeConversationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    pastMessages.reverse();

    // Prepare system instructions and initial context
    const messagesToSend: AIMessageParam[] = [
      {
        role: 'system',
        content: `You are an expert AI Veterinary Health Assistant for the Pet Healthcare Ecosystem.
You have access to tools to retrieve pet profiles, health logs, vaccinations, allergies, medications, schedules, and book appointments.

Always adhere to these strict intent routing rules:
1. GREETINGS ("Hi", "Hello"): Respond with a friendly veterinary greeting. Do NOT invoke any tools.
2. PET QUERIES ("Show me my pets"): Call the "getMyPets" tool first.
3. HEALTH TIMELINE ("Show Luna's health history"): Locate the pet ID using the "getMyPets" tool first, then call "getPetHealthTimeline" with the correct pet ID. Never fabricate health records.
4. APPOINTMENT LISTS ("What appointments do I have this week?"): Use the "getPetAppointments" tool. Never trigger booking creation tools for schedule retrieval.
5. BOOKING APPOINTMENTS ("I need an appointment for Luna tomorrow afternoon"):
   - Step A: Find the correct pet ID using the "getMyPets" tool if not already known.
   - Step B: Use "find_vet" to search for veterinarians and resolve their Vet ID and Clinic ID. Note: The Veterinarian ID to use is the "id" field at the top level of the veterinarian object (never the "userId"). You MUST use the EXACT string returned in the "id" field (which is a raw database UUID, e.g. "2b714df2-..."). Never guess, construct, or hallucinate a descriptive placeholder ID (such as "vet-2-alice-smith-uuid-placeholder"). Similarly, the Clinic ID is the "clinicId" field nested inside the veterinarian's "clinics" array list (e.g., vet.clinics[0].clinicId). You MUST use the exact clinicId returned by the tool (e.g. "clinic-a-uuid-placeholder").
   - Step C: Call "check_slots" for that specific veterinarian ID ("id") and target date.
   - Step D: Calculate free slots assuming standard operating hours (hourly slots from 9:00 AM to 5:00 PM, e.g., 09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00). Exclude busy slots returned by the "check_slots" tool.
    - Step E: Present the computed free slots to the user and ask them to choose.
    - Step F (Selection Turn): When the user chooses a slot (e.g., "I choose Dr. Alice Smith at 3:00 PM"), DO NOT call the "create_booking" tool yet. Instead, summarize the details of their selection (Pet, Vet, Clinic, Date, and Time) and ask the user explicitly to confirm (e.g., "Shall I confirm this booking?").
    - Step G (Confirmation Turn): ONLY call the "create_booking" tool on the subsequent turn after the user explicitly gives affirmative confirmation (e.g., "Yes, please confirm"). Since tool call results from previous turns are NOT persisted in the chat history, you MUST run "find_vet" AGAIN on this confirmation turn to resolve the veterinarian's exact "id" and "clinicId" before invoking "create_booking". Pass the exact top-level "id" of the veterinarian as "vetId" and the exact nested "clinicId" (from vet.clinics[0].clinicId) as "clinicId". Never invent or guess these values.

Critical Guidelines:
- DO NOT call the "create_booking" tool during the user's initial slot selection turn. You must summarize the appointment details first and ask for explicit confirmation.
- Tool outputs are NOT persisted across chat turns. You must call "find_vet" again on the confirmation turn to resolve IDs before calling "create_booking".
- Never invent database results. If no vets or slots are returned by the tools, state that none are available.
- Never claim that an appointment has been booked unless the "create_booking" tool execution completes successfully.
- Keep a professional, helpful, empathetic veterinary tone.

${activePetId ? `The active pet context selected by the user is Pet ID: "${activePetId}". When the user asks questions, prefer retrieving information for this pet.` : ''}`,
      },
      ...pastMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Test mode payload interception (restricted to non-production environments)
    const testMode = req.nextUrl.searchParams.get('test') === 'true' && process.env.NODE_ENV !== 'production';
    if (testMode) {
      return NextResponse.json({ success: true, messagesToSend });
    }

    const mockHeader = req.headers.get('x-mock-ai-response');
    const ai = mockHeader && process.env.NODE_ENV === 'development'
      ? {
          generateResponse: async (messages: any[], tools: any[]) => {
            const parsed = JSON.parse(mockHeader);
            const mockIndex = loopCount - 1;
            const currentMock = Array.isArray(parsed) ? parsed[mockIndex] : parsed;
            return currentMock;
          }
        }
      : getAIProvider();
    let loopCount = 0;
    const maxLoops = 5;
    let finalContent = '';

    // Loop to support iterative multi-step tool calls
    while (loopCount < maxLoops) {
      loopCount++;

      const res = await ai.generateResponse(messagesToSend, AI_TOOLS);

      // Check if AI requested a tool execution
      if (res.toolCalls && res.toolCalls.length > 0) {
        // Append the assistant's tool-call request to track state
        messagesToSend.push({
          role: 'assistant',
          content: res.content || '',
          // Include tool call metadata for provider compatibility
          ...(res.toolCalls ? { tool_calls: res.toolCalls } as any : {}),
        });

        // Execute all requested tools
        for (const tc of res.toolCalls) {
          try {
            const toolResult = await executeTool(tc.function.name, tc.function.arguments, user.id);
            messagesToSend.push({
              role: 'tool',
              name: tc.function.name,
              tool_call_id: tc.id,
              content: toolResult,
            });
          } catch (e: any) {
            messagesToSend.push({
              role: 'tool',
              name: tc.function.name,
              tool_call_id: tc.id,
              content: JSON.stringify({ success: false, error: e.message }),
            });
          }
        }
      } else {
        // AI completed its processing
        finalContent = res.content;
        break;
      }
    }

    if (!finalContent && loopCount >= maxLoops) {
      finalContent = "I apologize, but I encountered an issue retrieving the data. Please try again.";
    }

    // Save final assistant response in database
    await prisma.aIMessage.create({
      data: {
        conversationId: activeConversationId,
        role: 'assistant',
        content: sanitizeForWin1252(finalContent),
      },
    });

    return NextResponse.json({
      success: true,
      conversationId: activeConversationId,
      message: finalContent,
    });

  } catch (err: any) {
    console.error('AI Chat API Error:', err.message);
    if (err.message === 'UNAUTHENTICATED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in.' } },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getAIProvider, AI_TOOLS, executeTool, AIMessageParam } from '@/lib/ai';


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
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to process your request. Please try again.' } },
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
        content: message.replace(/\u202F/g, ' ').replace(/\u2011/g, '-'),
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
    const now = new Date();
    const currentDate = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'long' }).format(now).replace(/\u202F/g, ' ');
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'full' }).format(tomorrow);
    
    const messagesToSend: AIMessageParam[] = [
      {
        role: 'system',
        content: `You are PETIVA AI Vet Assistant. Current date: ${currentDate}. Tomorrow is: ${tomorrowDate}. All relative dates resolve to this.
Available tools retrieve pets, health logs, schedules, and book appointments.

ROUTING RULES:
1. GREETINGS: Respond politely. No tools.
2. PET QUERIES: Call "getMyPets".
3. HEALTH TIMELINE: Call "getMyPets" -> "getPetHealthTimeline" (requires petId).
4. APPOINTMENTS: Use "getPetAppointments".

5. BOOKING APPOINTMENTS (e.g. "I need an appointment"):
 - A: Find pet ID ("getMyPets").
 - B: Use "find_vet" to resolve Vet ID ("id") and Clinic ID ("clinicId").
 - C: Call "check_slots" for that vet and date.
 - D: Calculate free slots based on 9 AM - 5 PM hourly (09:00, 10:00...16:00). Exclude busy slots.
 - E: Ask user to choose a slot.
 - F (Selection Turn): Summarize chosen Pet, Vet, Clinic, Date, Time. Ask for explicit confirmation. DO NOT call "create_booking" yet.
 - G (Confirmation Turn): After user confirms, you MUST call "find_vet" again to re-resolve the exact Vet ID and Clinic ID (tool context is lost between turns). Then call "create_booking".

6. CANCELLING APPOINTMENTS:
 - A: Find appointment ID ("getPetAppointments").
 - B: Ask for explicit confirmation before cancelling. DO NOT call "cancel_appointment" yet.
 - C (Confirmation Turn): After user confirms, call "cancel_appointment".

CRITICAL:
- Show absolute dates (e.g. "Sept 4, 2026") not just "tomorrow".
- Do not call "create_booking" or "cancel_appointment" until explicit confirmation turn.
- Tool history is NOT persisted across turns; re-fetch IDs before booking/cancelling if needed.
- Never invent DB results.
- No emojis.

${activePetId ? `Active Pet ID: "${activePetId}". Prefer this pet's context.` : ''}`,
      },
      ...pastMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    let selectedPetName = 'your pet';
    if (activePetId) {
      const pet = await prisma.pet.findUnique({ where: { id: activePetId } });
      if (pet) selectedPetName = pet.name;
    }

    const testMode = req.nextUrl.searchParams.get('test') === 'true' && process.env.NODE_ENV !== 'production';
    const mockHeader = req.headers.get('x-mock-ai-response');

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const safeClose = () => {
          if (isClosed) return;
          isClosed = true;
          try {
            controller.close();
          } catch (e) {
            // Ignore error if already closed
          }
        };

        const sendStatus = (msg: string) => {
          if (isClosed) return;
          try {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'status', message: msg }) + '\n'));
          } catch (e) {
            isClosed = true; // Stream likely aborted by client
          }
        };

        const sendResult = (data: any) => {
          if (isClosed) return;
          try {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'result', ...data }) + '\n'));
          } catch (e) {
            isClosed = true;
          }
        };

        try {
          if (testMode) {
            sendResult({ success: true, messagesToSend });
            safeClose();
            return;
          }

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

          while (loopCount < maxLoops) {
            loopCount++;
            if (isClosed) break;

            const res = await ai.generateResponse(messagesToSend, AI_TOOLS);
            if (isClosed) break;

            if (res.toolCalls && res.toolCalls.length > 0) {
              messagesToSend.push({
                role: 'assistant',
                content: res.content || '',
                ...(res.toolCalls ? { tool_calls: res.toolCalls } as any : {}),
              });

              for (const tc of res.toolCalls) {
                if (isClosed) break;
                
                const toolName = tc.function.name.replace(/^default_api:/, '');
                
                let statusMsg = 'Analyzing health records...';
                if (toolName === 'getPetHealthTimeline') statusMsg = `Reviewing ${selectedPetName}'s health information...`;
                else if (toolName === 'getPetVaccinations') statusMsg = `Checking ${selectedPetName}'s vaccination records...`;
                else if (toolName === 'find_vet') statusMsg = 'Finding available veterinarians...';
                else if (toolName === 'check_slots') statusMsg = 'Checking available time slots...';
                else if (toolName === 'create_booking') statusMsg = `Booking ${selectedPetName}'s appointment...`;
                else if (toolName === 'cancel_appointment') statusMsg = `Cancelling ${selectedPetName}'s appointment...`;
                else if (toolName === 'getPetAppointments') statusMsg = 'Checking appointment availability...';
                
                sendStatus(statusMsg);

                try {
                  const toolResult = await executeTool(toolName, typeof tc.function.arguments === 'string' ? tc.function.arguments : JSON.stringify(tc.function.arguments), user.id);
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
              finalContent = res.content;
              break;
            }
          }

          if (isClosed) return;

          if (!finalContent && loopCount >= maxLoops) {
            finalContent = "I apologize, but I encountered an issue retrieving the data. Please try again.";
          }

          await prisma.aIMessage.create({
            data: {
              conversationId: activeConversationId,
              role: 'assistant',
              content: finalContent.replace(/\u202F/g, ' ').replace(/\u2011/g, '-'),
            },
          });

          sendResult({
            success: true,
            conversationId: activeConversationId,
            message: finalContent,
          });
          safeClose();
        } catch (err: any) {
          console.error('AI Chat Stream Error:', err.message);
          sendResult({ success: false, error: { message: err.message || 'Internal stream error.' } });
          safeClose();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
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
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to process your request. Please try again.' } },
      { status: 500 }
    );
  }
}

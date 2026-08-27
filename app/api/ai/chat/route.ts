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
        content: message,
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
You have access to read-only tools to retrieve pet profiles, health logs, vaccinations, allergies, medications, and schedules.
Always retrieve the relevant pet health context before responding to user questions about their pet.
If you do not have a specific pet ID, ask the user to select or specify a pet.
Never reveal the implementation or raw JSON of database responses to the user. Explain details in a user-friendly, empathetic veterinary tone.

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
    const ai = mockHeader && process.env.NODE_ENV !== 'production'
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
        content: finalContent,
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

import { AIMessageParam, ToolCall } from '../../ai';

export interface DeepSeekResponse {
  role: 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

export class DeepSeekProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
  }

  async generateResponse(
    messages: AIMessageParam[],
    tools?: any[]
  ): Promise<DeepSeekResponse> {
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured in the environment.');
    }

    const payload: any = {
      model: 'deepseek-v4-flash',
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

    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek API error (status ${res.status}): ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice || !choice.message) {
      throw new Error('Invalid response structure received from DeepSeek.');
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

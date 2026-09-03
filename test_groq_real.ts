import { getAIProvider, AI_TOOLS } from './lib/ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const provider = getAIProvider();
  try {
    const res = await provider.generateResponse([
      { role: 'system', content: 'You are an AI assistant.' },
      { role: 'user', content: 'I need an appointment for Luna tomorrow afternoon' }
    ], AI_TOOLS);
    console.log('Success!', res.toolCalls);
  } catch (e) {
    console.error('FAILED!', e.message);
  }
}
run();

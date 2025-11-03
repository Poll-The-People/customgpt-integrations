/**
 * AI Completion Logic
 * Supports both CustomGPT and OpenAI completions
 */

import OpenAI from 'openai';
import { customGPTClient } from '@/lib/ai/customgpt-client';
import { truncateForVoice } from '@/lib/ai/truncate';
import { CUSTOMGPT_CONFIG, OPENAI_CONFIG, AI_CONFIG } from '@/config/constants';

const USE_CUSTOMGPT = CUSTOMGPT_CONFIG.useCustomGPT;
const AI_COMPLETION_MODEL = OPENAI_CONFIG.completionModel;
const OPENAI_API_KEY = OPENAI_CONFIG.apiKey;

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Get AI completion (CustomGPT or OpenAI)
 *
 * @param messages - Conversation history
 * @param sessionId - Session ID for CustomGPT
 * @param forVoice - Whether to truncate response for voice mode
 * @returns AI response text
 */
export async function getCompletion(
  messages: Message[],
  sessionId?: string,
  forVoice: boolean = false
): Promise<string> {
  const startTime = performance.now();

  try {
    let response: string;

    if (USE_CUSTOMGPT) {
      // Use CustomGPT
      if (!sessionId) {
        throw new Error('Session ID required for CustomGPT');
      }

      const userMessage = messages[messages.length - 1].content;
      const messageData = await customGPTClient.sendMessage(sessionId, userMessage);
      response = messageData.openai_response;
    } else {
      // Use OpenAI
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY required when USE_CUSTOMGPT=false');
      }

      const client = new OpenAI({ apiKey: OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: AI_COMPLETION_MODEL,
        messages: messages as any,
        max_tokens: forVoice ? AI_CONFIG.voiceMaxTokens : undefined,
      });

      response = completion.choices[0]?.message?.content || '';
    }

    // Truncate for voice mode if needed
    if (forVoice && USE_CUSTOMGPT) {
      response = truncateForVoice(response);
    }

    const duration = ((performance.now() - startTime) / 1000).toFixed(3);
    console.log(`[TIMING] AI Completion: ${duration}s`);

    return response;
  } catch (error) {
    console.error('[AI] Completion failed:', error);
    throw error;
  }
}

/**
 * Stream AI completion (CustomGPT streaming)
 *
 * @param userMessage - User's message
 * @param sessionId - Session ID
 * @returns AsyncGenerator of response chunks
 */
export async function* getCompletionStream(
  userMessage: string,
  sessionId: string
): AsyncGenerator<string, void, unknown> {
  if (!USE_CUSTOMGPT) {
    throw new Error('Streaming only supported with CustomGPT');
  }

  yield* customGPTClient.sendMessageStream(sessionId, userMessage);
}

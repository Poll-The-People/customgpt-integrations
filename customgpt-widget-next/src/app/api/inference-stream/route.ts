/**
 * Voice Mode Streaming Endpoint with Progressive Updates
 * Sends updates as events become available: STT → AI → TTS
 * Uses Server-Sent Events (SSE) for progressive caption display
 */

import { NextRequest } from 'next/server';
import { transcribeFromBuffer } from '@/lib/audio/stt';
import { getCompletion } from '@/lib/ai/completion';
import { textToSpeech, cleanupAudioFile } from '@/lib/audio/tts';
import { customGPTClient } from '@/lib/ai/customgpt-client';
import { CUSTOMGPT_CONFIG } from '@/config/constants';
import { getTranslations } from '@/config/i18n';
import fs from 'fs/promises';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  const timings: Record<string, string> = {};

  // Create streaming response with Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE event
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
        console.log(`[SSE] Sent event: ${event}`, data);
      };

      try {
        // 1. Parse multipart form data
        const parseStart = performance.now();
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const conversationHeader = request.headers.get('conversation') || 'W10=';
        timings.parse = ((performance.now() - parseStart) / 1000).toFixed(3);

        if (!audioFile) {
          sendEvent('error', { message: 'No audio file provided' });
          controller.close();
          return;
        }

        console.log('[INFERENCE-STREAM] Processing audio:', {
          size: audioFile.size,
          type: audioFile.type,
          parseTime: `${timings.parse}s`
        });

        // 2. Speech-to-Text & Session Creation in Parallel
        const sttStart = performance.now();
        const bufferStart = performance.now();
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        timings.buffer = ((performance.now() - bufferStart) / 1000).toFixed(3);

        let sessionPromise: Promise<{session_id: string}> | undefined;

        if (CUSTOMGPT_CONFIG.useCustomGPT) {
          const sessionStart = performance.now();
          sessionPromise = customGPTClient.createConversation().then(conv => {
            timings.create_session = ((performance.now() - sessionStart) / 1000).toFixed(3);
            return conv;
          });
        }

        const transcribeStart = performance.now();
        const transcript = await transcribeFromBuffer(audioBuffer, audioFile.type);
        timings.transcribe = ((performance.now() - transcribeStart) / 1000).toFixed(3);

        const sttDuration = ((performance.now() - sttStart) / 1000).toFixed(3);
        timings.stt_total = sttDuration;

        if (!transcript || transcript === '[Speech recognition unavailable]') {
          sendEvent('error', { message: 'Speech recognition failed' });
          controller.close();
          return;
        }

        // ✅ IMMEDIATE UPDATE 1: Send transcript as soon as STT completes
        sendEvent('transcript', {
          text: transcript,
          timing: sttDuration
        });

        // 3. Decode conversation history
        const decodeStart = performance.now();
        const conversationJson = Buffer.from(conversationHeader, 'base64').toString('utf-8');
        const conversation: Message[] = JSON.parse(conversationJson);

        if (conversation.length === 0) {
          const t = getTranslations();
          conversation.push({
            role: 'system',
            content: 'You are a helpful AI assistant. Keep responses brief and conversational for voice interaction.',
          });
        }

        conversation.push({
          role: 'user',
          content: transcript,
        });
        timings.decode = ((performance.now() - decodeStart) / 1000).toFixed(3);

        // 4. Get AI completion
        const aiStart = performance.now();
        let sessionId: string | undefined;

        if (sessionPromise) {
          const conv = await sessionPromise;
          sessionId = conv.session_id;
        }

        const completionStart = performance.now();
        const aiResponse = await getCompletion(conversation, sessionId, true);
        timings.ai_completion = ((performance.now() - completionStart) / 1000).toFixed(3);

        const aiDuration = ((performance.now() - aiStart) / 1000).toFixed(3);
        timings.ai_total = aiDuration;

        conversation.push({
          role: 'assistant',
          content: aiResponse,
        });

        // ✅ IMMEDIATE UPDATE 2: Send AI response text as soon as completion finishes
        sendEvent('ai_response', {
          text: aiResponse,
          timing: aiDuration
        });

        // 5. Text-to-Speech (runs in background, user already sees text)
        const ttsStart = performance.now();
        const audioPath = await textToSpeech(aiResponse);
        const ttsDuration = ((performance.now() - ttsStart) / 1000).toFixed(3);
        timings.tts_total = ttsDuration;

        // Read audio file
        const readStart = performance.now();
        const audioData = await fs.readFile(audioPath);
        timings.read_audio = ((performance.now() - readStart) / 1000).toFixed(3);

        // Cleanup
        const cleanupStart = performance.now();
        await cleanupAudioFile(audioPath);
        timings.cleanup = ((performance.now() - cleanupStart) / 1000).toFixed(3);

        // Encode conversation for next request
        const encodeStart = performance.now();
        const lastMessages = conversation.slice(-2);
        const conversationB64 = Buffer.from(JSON.stringify(lastMessages)).toString('base64');
        timings.encode = ((performance.now() - encodeStart) / 1000).toFixed(3);

        const totalDuration = ((performance.now() - startTime) / 1000).toFixed(3);
        timings.total = totalDuration;

        // ✅ FINAL UPDATE: Send audio data and conversation history
        sendEvent('audio', {
          data: audioData.toString('base64'),
          conversation: conversationB64,
          timings: timings
        });

        // Detailed latency logging
        console.log(`[LATENCY] Total: ${totalDuration}s`);
        console.log(`[LATENCY] ├─ STT: ${timings.stt_total}s → Transcript sent immediately`);
        console.log(`[LATENCY] ├─ AI: ${timings.ai_total}s → Response text sent immediately`);
        console.log(`[LATENCY] └─ TTS: ${timings.tts_total}s → Audio sent when ready`);

        // Close the stream
        controller.close();

      } catch (error: any) {
        console.error('[INFERENCE-STREAM] Error:', error);
        sendEvent('error', { message: error.message || 'Processing failed' });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

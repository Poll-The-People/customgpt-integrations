/**
 * Voice Mode Endpoint
 * Complete STT → AI → TTS pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { transcribeFromBuffer } from '@/lib/audio/stt';
import { getCompletion } from '@/lib/ai/completion';
import { textToSpeech, cleanupAudioFile } from '@/lib/audio/tts';
import { customGPTClient } from '@/lib/ai/customgpt-client';
import { CUSTOMGPT_CONFIG } from '@/config/constants';
import { getTranslations } from '@/config/i18n';
import fs from 'fs/promises';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for Pro tier

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  const timings: Record<string, string> = {};

  try {
    // 1. Parse multipart form data
    const parseStart = performance.now();
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const conversationHeader = request.headers.get('conversation') || 'W10='; // Empty array base64
    timings.parse = ((performance.now() - parseStart) / 1000).toFixed(3);

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('[INFERENCE] Processing audio:', {
      size: audioFile.size,
      type: audioFile.type,
      parseTime: `${timings.parse}s`
    });

    // 2. Speech-to-Text & Session Creation in Parallel (saves ~1s)
    const sttStart = performance.now();
    const bufferStart = performance.now();
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    timings.buffer = ((performance.now() - bufferStart) / 1000).toFixed(3);

    // OPTIMIZATION: Run STT and session creation in parallel
    const transcribeStart = performance.now();
    let sessionPromise: Promise<{session_id: string}> | undefined;

    if (CUSTOMGPT_CONFIG.useCustomGPT) {
      const sessionStart = performance.now();
      // Start session creation without awaiting
      sessionPromise = customGPTClient.createConversation().then(conv => {
        timings.create_session = ((performance.now() - sessionStart) / 1000).toFixed(3);
        return conv;
      });
    }

    // Run transcription (will complete while session is being created)
    const transcript = await transcribeFromBuffer(audioBuffer, audioFile.type);
    timings.transcribe = ((performance.now() - transcribeStart) / 1000).toFixed(3);

    const sttDuration = ((performance.now() - sttStart) / 1000).toFixed(3);
    timings.stt_total = sttDuration;
    console.log(`[TIMING] STT: ${sttDuration}s (buffer: ${timings.buffer}s, transcribe: ${timings.transcribe}s) | Transcript: ${transcript}`);

    if (!transcript || transcript === '[Speech recognition unavailable]') {
      return NextResponse.json({ error: 'Speech recognition failed' }, { status: 500 });
    }

    // Send immediate transcript update via custom header for progressive display
    // Client will read X-Transcript-Ready header to show user message immediately
    const transcriptB64Early = Buffer.from(transcript).toString('base64');

    // 3. Decode conversation history
    const decodeStart = performance.now();
    const conversationJson = Buffer.from(conversationHeader, 'base64').toString('utf-8');
    const conversation: Message[] = JSON.parse(conversationJson);

    // Add system prompt if empty
    if (conversation.length === 0) {
      const t = getTranslations();
      conversation.push({
        role: 'system',
        content: 'You are a helpful AI assistant. Keep responses brief and conversational for voice interaction.',
      });
    }

    // Add user message
    conversation.push({
      role: 'user',
      content: transcript,
    });
    timings.decode = ((performance.now() - decodeStart) / 1000).toFixed(3);

    // 4. Get AI completion (wait for session if needed)
    const aiStart = performance.now();
    let sessionId: string | undefined;

    if (sessionPromise) {
      const conv = await sessionPromise;
      sessionId = conv.session_id;
    }

    const completionStart = performance.now();
    const aiResponse = await getCompletion(conversation, sessionId, true); // forVoice=true
    timings.ai_completion = ((performance.now() - completionStart) / 1000).toFixed(3);

    const aiDuration = ((performance.now() - aiStart) / 1000).toFixed(3);
    timings.ai_total = aiDuration;

    if (CUSTOMGPT_CONFIG.useCustomGPT && timings.create_session) {
      console.log(`[TIMING] AI: ${aiDuration}s (session: ${timings.create_session}s, completion: ${timings.ai_completion}s)`);
    } else {
      console.log(`[TIMING] AI: ${aiDuration}s (completion: ${timings.ai_completion}s)`);
    }

    // Add assistant response to conversation
    conversation.push({
      role: 'assistant',
      content: aiResponse,
    });

    // 5. Text-to-Speech
    const ttsStart = performance.now();
    const audioPath = await textToSpeech(aiResponse);
    const ttsDuration = ((performance.now() - ttsStart) / 1000).toFixed(3);
    timings.tts_total = ttsDuration;
    console.log(`[TIMING] TTS: ${ttsDuration}s`);

    // Read audio file
    const readStart = performance.now();
    const audioData = await fs.readFile(audioPath);
    timings.read_audio = ((performance.now() - readStart) / 1000).toFixed(3);

    // Cleanup
    const cleanupStart = performance.now();
    await cleanupAudioFile(audioPath);
    timings.cleanup = ((performance.now() - cleanupStart) / 1000).toFixed(3);

    // Encode last 2 messages in conversation header
    const encodeStart = performance.now();
    const lastMessages = conversation.slice(-2);
    const conversationB64 = Buffer.from(JSON.stringify(lastMessages)).toString('base64');

    // Encode transcript and AI response for Unicode support (base64)
    const transcriptB64 = Buffer.from(transcript).toString('base64');
    const aiResponseB64 = Buffer.from(aiResponse).toString('base64');
    timings.encode = ((performance.now() - encodeStart) / 1000).toFixed(3);

    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(3);
    timings.total = totalDuration;

    // Detailed latency breakdown
    console.log(`[LATENCY] Total: ${totalDuration}s`);
    console.log(`[LATENCY] ├─ Parse FormData: ${timings.parse}s`);
    console.log(`[LATENCY] ├─ STT (${timings.stt_total}s)`);
    console.log(`[LATENCY] │  ├─ Buffer conversion: ${timings.buffer}s`);
    console.log(`[LATENCY] │  └─ OpenAI transcribe: ${timings.transcribe}s`);
    console.log(`[LATENCY] ├─ Decode conversation: ${timings.decode}s`);
    console.log(`[LATENCY] ├─ AI (${timings.ai_total}s)`);
    if (timings.create_session) {
      console.log(`[LATENCY] │  ├─ Create session: ${timings.create_session}s`);
    }
    console.log(`[LATENCY] │  └─ Get completion: ${timings.ai_completion}s`);
    console.log(`[LATENCY] ├─ TTS: ${timings.tts_total}s`);
    console.log(`[LATENCY] ├─ Read audio: ${timings.read_audio}s`);
    console.log(`[LATENCY] ├─ Cleanup: ${timings.cleanup}s`);
    console.log(`[LATENCY] └─ Encode response: ${timings.encode}s`);
    console.log(`[LATENCY] Bottlenecks: STT=${timings.stt_total}s, AI=${timings.ai_total}s, TTS=${timings.tts_total}s`);

    // Return audio with conversation header and timing info
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-Conversation': conversationB64,
        'X-Transcript': transcriptB64,
        'X-AI-Response': aiResponseB64,
        // Timing headers for latency tracking
        'X-Timing-Total': timings.total,
        'X-Timing-Parse': timings.parse,
        'X-Timing-STT': timings.stt_total,
        'X-Timing-STT-Buffer': timings.buffer,
        'X-Timing-STT-Transcribe': timings.transcribe,
        'X-Timing-Decode': timings.decode,
        'X-Timing-AI': timings.ai_total,
        'X-Timing-AI-Session': timings.create_session || '0',
        'X-Timing-AI-Completion': timings.ai_completion,
        'X-Timing-TTS': timings.tts_total,
        'X-Timing-Read': timings.read_audio,
        'X-Timing-Cleanup': timings.cleanup,
        'X-Timing-Encode': timings.encode,
      },
    });
  } catch (error: any) {
    console.error('[INFERENCE] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

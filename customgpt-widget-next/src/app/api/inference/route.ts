/**
 * Voice Mode Endpoint
 * Complete STT → AI → TTS pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { transcribeFromBuffer } from '@/lib/audio/stt';
import { getCompletion } from '@/lib/ai/completion';
import { textToSpeech, cleanupAudioFile } from '@/lib/audio/tts';
import { customGPTClient } from '@/lib/ai/customgpt-client';
import fs from 'fs/promises';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for Pro tier

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    // 1. Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const conversationHeader = request.headers.get('conversation') || 'W10='; // Empty array base64

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('[INFERENCE] Processing audio:', {
      size: audioFile.size,
      type: audioFile.type,
    });

    // 2. Speech-to-Text
    const sttStart = performance.now();
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const transcript = await transcribeFromBuffer(audioBuffer, audioFile.type);
    const sttDuration = ((performance.now() - sttStart) / 1000).toFixed(3);
    console.log(`[TIMING] STT: ${sttDuration}s | Transcript: ${transcript}`);

    if (!transcript || transcript === '[Speech recognition unavailable]') {
      return NextResponse.json({ error: 'Speech recognition failed' }, { status: 500 });
    }

    // 3. Decode conversation history
    const conversationJson = Buffer.from(conversationHeader, 'base64').toString('utf-8');
    const conversation: Message[] = JSON.parse(conversationJson);

    // Add system prompt if empty
    if (conversation.length === 0) {
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

    // 4. Get AI completion
    const aiStart = performance.now();
    let sessionId: string | undefined;

    // Create session if using CustomGPT
    const useCustomGPT = process.env.USE_CUSTOMGPT === 'true';
    if (useCustomGPT) {
      const conv = await customGPTClient.createConversation();
      sessionId = conv.session_id;
    }

    const aiResponse = await getCompletion(conversation, sessionId, true); // forVoice=true
    const aiDuration = ((performance.now() - aiStart) / 1000).toFixed(3);
    console.log(`[TIMING] AI: ${aiDuration}s`);

    // Add assistant response to conversation
    conversation.push({
      role: 'assistant',
      content: aiResponse,
    });

    // 5. Text-to-Speech
    const ttsStart = performance.now();
    const audioPath = await textToSpeech(aiResponse);
    const ttsDuration = ((performance.now() - ttsStart) / 1000).toFixed(3);
    console.log(`[TIMING] TTS: ${ttsDuration}s`);

    // Read audio file
    const audioData = await fs.readFile(audioPath);

    // Cleanup
    await cleanupAudioFile(audioPath);

    // Encode last 2 messages in conversation header
    const lastMessages = conversation.slice(-2);
    const conversationB64 = Buffer.from(JSON.stringify(lastMessages)).toString('base64');

    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(3);
    console.log(`[TIMING] TOTAL: ${totalDuration}s (STT: ${sttDuration}s, AI: ${aiDuration}s, TTS: ${ttsDuration}s)`);

    // Encode transcript and AI response for Unicode support (base64)
    const transcriptB64 = Buffer.from(transcript).toString('base64');
    const aiResponseB64 = Buffer.from(aiResponse).toString('base64');

    // Return audio with conversation header and timing info
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-Conversation': conversationB64,
        'X-STT-Time': sttDuration,
        'X-AI-Time': aiDuration,
        'X-Transcript': transcriptB64,
        'X-AI-Response': aiResponseB64,
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

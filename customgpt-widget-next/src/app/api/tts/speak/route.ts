import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech, cleanupAudioFile } from '@/lib/audio/tts';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    const audioPath = await textToSpeech(text);
    const audioData = await fs.readFile(audioPath);
    await cleanupAudioFile(audioPath);

    return new NextResponse(audioData, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

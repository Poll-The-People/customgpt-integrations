import { NextRequest, NextResponse } from 'next/server';
import { transcribeFromBuffer, transcribeWithTimestamps } from '@/lib/audio/stt';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for Pro tier (10 for free tier)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') || formData.get('file'); // Support both 'audio' and 'file'

    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());

    // Check if word-level timestamps are requested
    const responseFormat = formData.get('response_format') as string;
    const timestampGranularities = formData.getAll('timestamp_granularities[]') as string[];

    if (responseFormat === 'verbose_json' && timestampGranularities.includes('word')) {
      // Return full Whisper response with word timestamps
      console.log('[Transcribe API] Requesting word-level timestamps');
      const response = await transcribeWithTimestamps(buffer, audioFile.type, 'verbose_json', ['word']);
      return NextResponse.json(response);
    } else {
      // Return simple transcript string
      console.log('[Transcribe API] Requesting simple transcript');
      const transcript = await transcribeFromBuffer(buffer, audioFile.type);
      return NextResponse.json({ success: true, transcript });
    }
  } catch (error: any) {
    console.error('[Transcribe API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

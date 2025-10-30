import { NextRequest, NextResponse } from 'next/server';
import { transcribeFromBuffer } from '@/lib/audio/stt';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const transcript = await transcribeFromBuffer(buffer, audioFile.type);

    return NextResponse.json({ success: true, transcript });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

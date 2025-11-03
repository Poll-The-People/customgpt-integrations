import { NextRequest, NextResponse } from 'next/server';
import { customGPTClient } from '@/lib/ai/customgpt-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const citationId = parseInt(id, 10);

    if (isNaN(citationId)) {
      return NextResponse.json(
        { error: 'Invalid citation ID' },
        { status: 400 }
      );
    }

    // Fetch citation details from CustomGPT API
    const citation = await customGPTClient.getCitationDetails(citationId);

    return NextResponse.json(citation);
  } catch (error: any) {
    const { id } = await params;
    console.error(`Failed to fetch citation ${id}:`, error);

    return NextResponse.json(
      { error: error.message || 'Failed to fetch citation' },
      { status: 500 }
    );
  }
}

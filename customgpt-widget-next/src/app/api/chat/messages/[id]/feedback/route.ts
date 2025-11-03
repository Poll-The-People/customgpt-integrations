import { NextRequest, NextResponse } from 'next/server';
import { customGPTClient } from '@/lib/ai/customgpt-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Update message reaction (like/dislike)
 * PUT /api/chat/messages/:id/feedback
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messageId = parseInt(id, 10);

    if (isNaN(messageId)) {
      return NextResponse.json(
        { error: 'Invalid message ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { sessionId, reaction } = body;

    console.log('[Feedback API] Received request:', {
      messageId,
      sessionId,
      reaction,
      bodyKeys: Object.keys(body)
    });

    if (!sessionId) {
      console.error('[Feedback API] Missing sessionId in request body');
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (reaction !== 'liked' && reaction !== 'disliked' && reaction !== null) {
      return NextResponse.json(
        { error: 'Reaction must be "liked", "disliked", or null' },
        { status: 400 }
      );
    }

    // Update reaction via CustomGPT API
    const result = await customGPTClient.updateMessageReaction(
      sessionId,
      messageId,
      reaction
    );

    return NextResponse.json({
      success: true,
      response_feedback: result.response_feedback
    });
  } catch (error: any) {
    const { id } = await params;
    console.error(`[Feedback] Failed to update reaction for message ${id}:`, error);

    return NextResponse.json(
      { error: error.message || 'Failed to update reaction' },
      { status: 500 }
    );
  }
}

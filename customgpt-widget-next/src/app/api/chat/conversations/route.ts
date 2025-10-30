/**
 * Conversations Endpoint - Create new chat session
 */

import { NextResponse } from 'next/server';
import { customGPTClient } from '@/lib/ai/customgpt-client';

export async function POST() {
  try {
    const conversation = await customGPTClient.createConversation();

    return NextResponse.json({
      success: true,
      session_id: conversation.session_id,
      data: conversation,
    });
  } catch (error: any) {
    console.error('[API] Create conversation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

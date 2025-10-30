/**
 * Messages Endpoint - Send/receive chat messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { customGPTClient } from '@/lib/ai/customgpt-client';
import { processMarkdown } from '@/lib/markdown-processor';

export async function POST(request: NextRequest) {
  try {
    const { session_id, message, stream } = await request.json();

    if (!session_id || !message) {
      return NextResponse.json(
        { error: 'session_id and message are required' },
        { status: 400 }
      );
    }

    const startTime = performance.now();

    if (stream) {
      // Streaming response
      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of customGPTClient.sendMessageStream(session_id, message)) {
              const data = `data: ${JSON.stringify({ chunk })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
            controller.close();
          } catch (error: any) {
            controller.error(error);
          }
        },
      });

      return new NextResponse(customStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const response = await customGPTClient.sendMessage(session_id, message);
      const processedResponse = processMarkdown(response.openai_response);

      const duration = ((performance.now() - startTime) / 1000).toFixed(3);
      console.log(`[TIMING] Chat Message: ${duration}s`);

      return NextResponse.json({
        success: true,
        message: {
          ...response,
          openai_response: processedResponse,
        },
      });
    }
  } catch (error: any) {
    console.error('[API] Chat message error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

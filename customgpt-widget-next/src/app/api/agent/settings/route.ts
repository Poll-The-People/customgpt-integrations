import { NextResponse } from 'next/server';

export async function GET() {
  // Return settings matching the expected format from useAgentSettings hook
  return NextResponse.json({
    chatbot_avatar: process.env.NEXT_PUBLIC_AVATAR_GLB_URL || null,
    chatbot_title: 'CustomGPT Widget',
    user_name: 'You',
    example_questions: [
      'What can you help me with?',
      'Tell me about your capabilities',
      'How does voice mode work?'
    ]
  });
}

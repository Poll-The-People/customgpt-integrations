import { NextResponse } from 'next/server';
import { customGPTClient } from '@/lib/ai/customgpt-client';
import { CUSTOMGPT_CONFIG } from '@/config/constants';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  try {
    // Only fetch from CustomGPT API if it's configured and enabled
    if (CUSTOMGPT_CONFIG.useCustomGPT && CUSTOMGPT_CONFIG.projectId && CUSTOMGPT_CONFIG.apiKey) {
      try {
        // Fetch BOTH agent details (for project_name) AND settings
        const [agentDetails, settings] = await Promise.all([
          customGPTClient.getAgentDetails(),
          customGPTClient.getAgentSettings()
        ]);

        // Use project_name from agent details as the primary agent name
        // Fall back to chatbot_title from settings only if project_name is missing
        const agentName = agentDetails.project_name || settings.chatbot_title;

        console.log('[Agent Settings] Successfully fetched from CustomGPT:', {
          projectName: agentDetails.project_name,
          chatbotTitle: settings.chatbot_title,
          usingName: agentName,
          hasAvatar: !!settings.chatbot_avatar,
          avatarUrl: settings.chatbot_avatar,
        });

        // Return settings in the format expected by useAgentSettings hook
        return NextResponse.json({
          chatbot_avatar: settings.chatbot_avatar,
          chatbot_title: agentName, // Use project_name as the primary name
          user_name: 'You', // Not provided by CustomGPT API, use default
          example_questions: settings.example_questions || [],
          // Include additional useful settings
          default_prompt: settings.default_prompt,
          persona_instructions: settings.persona_instructions,
          enable_citations: settings.enable_citations,
          enable_feedbacks: settings.enable_feedbacks,
          markdown_enabled: settings.markdown_enabled,
          chatbot_model: settings.chatbot_model,
          // UI customization
          chatbot_color: settings.chatbot_color,
          chatbot_toolbar_color: settings.chatbot_toolbar_color,
          chatbot_background_color: settings.chatbot_background_color,
        });
      } catch (apiError) {
        console.error('[Agent Settings] CustomGPT API call failed:', apiError);
        throw apiError; // Re-throw to be caught by outer catch block
      }
    } else {
      console.error('[Agent Settings] CustomGPT not configured - missing project ID or API key');
      throw new Error('CustomGPT configuration is required');
    }
  } catch (error) {
    console.error('[Agent Settings] Failed to fetch agent settings:', error);

    // Return error response - no fallback to "AI Assistant"
    // The frontend should handle missing agent name gracefully
    return NextResponse.json(
      {
        error: 'Failed to fetch agent settings. Please check your CustomGPT configuration.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

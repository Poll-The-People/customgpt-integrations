import { NextResponse } from 'next/server';

export async function GET() {
  // Check if required API keys are configured
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const customgptApiKey = process.env.CUSTOMGPT_API_KEY;
  const customgptProjectId = process.env.CUSTOMGPT_PROJECT_ID;
  const useCustomGPT = process.env.USE_CUSTOMGPT === 'true';

  // Determine TTS provider
  const ttsProvider = process.env.TTS_PROVIDER || 'OPENAI';
  const sttModel = process.env.STT_MODEL || 'gpt-4o-mini-transcribe';

  // Calculate capabilities based on configuration
  const capabilities = {
    voice_mode_enabled: !!openaiApiKey, // Requires OpenAI for STT/TTS
    stt_enabled: !!openaiApiKey,
    tts_enabled: !!(openaiApiKey || ttsProvider === 'gTTS' || ttsProvider === 'STREAMELEMENTS'),
    ai_completions_enabled: !!(useCustomGPT ? (customgptApiKey && customgptProjectId) : openaiApiKey),
    provider_info: {
      stt: openaiApiKey ? sttModel : undefined,
      tts: ttsProvider,
      ai: useCustomGPT ? 'CustomGPT' : 'OpenAI'
    }
  };

  return NextResponse.json({
    status: 'success',
    data: capabilities
  });
}

import OpenAI from 'openai';
import { Readable } from 'stream';

const LANGUAGE = process.env.LANGUAGE || 'en';
const STT_MODEL = process.env.STT_MODEL || 'gpt-4o-mini-transcribe';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Internal transcription function
 *
 * @param audioBlob - Audio blob (WebM, MP4, or MPEG format)
 * @param filename - Optional filename for the audio file
 * @returns Transcribed text
 */
async function transcribeInternal(
  audioBlob: Blob,
  filename: string = 'audio.webm'
): Promise<string> {
  console.log('[STT] Calling model:', STT_MODEL);

  // Convert Blob to File object for OpenAI API
  const audioFile = new File([audioBlob], filename, { type: audioBlob.type });

  const response = await client.audio.transcriptions.create({
    model: STT_MODEL,
    file: audioFile,
    language: LANGUAGE,
  });

  return response.text;
}

/**
 * Transcribe audio with retry logic and fallback
 *
 * Key improvement: OpenAI Whisper API accepts WebM directly,
 * eliminating need for FFmpeg server-side conversion
 *
 * @param audioBlob - Audio blob from browser MediaRecorder
 * @param mimeType - MIME type of the audio (e.g., 'audio/webm;codecs=opus')
 * @returns Transcribed text
 */
export async function transcribe(
  audioBlob: Blob,
  mimeType?: string
): Promise<string> {
  const startTime = performance.now();

  try {
    // Determine filename extension from MIME type
    const extension = getExtensionFromMimeType(mimeType || audioBlob.type);
    const filename = `audio.${extension}`;

    console.log('[STT] Processing audio:', {
      size: audioBlob.size,
      type: audioBlob.type,
      filename,
    });

    // Transcribe directly - no conversion needed!
    const transcription = await transcribeInternal(audioBlob, filename);

    const duration = ((performance.now() - startTime) / 1000).toFixed(3);
    console.log(`[TIMING] STT (${STT_MODEL}): ${duration}s`);
    console.log('[STT] User prompt:', transcription);

    return transcription;
  } catch (error) {
    console.error('[STT] Transcription failed:', error);

    // Fallback to text-only mode
    return '[Speech recognition unavailable]';
  }
}

/**
 * Get file extension from MIME type
 *
 * @param mimeType - MIME type string
 * @returns File extension
 */
function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm'; // Default
}

/**
 * Transcribe audio from Node.js Buffer (for API routes)
 *
 * @param buffer - Audio data buffer
 * @param mimeType - MIME type of the audio
 * @returns Transcribed text
 */
export async function transcribeFromBuffer(
  buffer: Buffer,
  mimeType: string = 'audio/webm'
): Promise<string> {
  // Convert Buffer to Blob
  const audioBlob = new Blob([buffer as any], { type: mimeType });
  return transcribe(audioBlob, mimeType);
}

/**
 * Transcribe audio with word-level timestamps (verbose format)
 *
 * NOTE: word-level timestamps require the standard 'whisper-1' model,
 * not 'gpt-4o-mini-transcribe' which only supports 'json' or 'text' formats
 *
 * @param buffer - Audio data buffer
 * @param mimeType - MIME type of the audio
 * @param responseFormat - 'verbose_json' for word timestamps
 * @param timestampGranularities - ['word'] for word-level timestamps
 * @returns Full Whisper response with word timestamps
 */
export async function transcribeWithTimestamps(
  buffer: Buffer,
  mimeType: string = 'audio/webm',
  responseFormat: 'verbose_json' | 'json' = 'verbose_json',
  timestampGranularities: ('word' | 'segment')[] = ['word']
): Promise<any> {
  const startTime = performance.now();

  try {
    // Determine filename extension from MIME type
    const extension = getExtensionFromMimeType(mimeType);
    const filename = `audio.${extension}`;

    // IMPORTANT: Use 'whisper-1' model for word timestamps
    // gpt-4o-mini-transcribe does NOT support verbose_json format
    const timestampModel = 'whisper-1';

    console.log('[STT] Processing audio with timestamps:', {
      size: buffer.length,
      type: mimeType,
      filename,
      model: timestampModel,
      responseFormat,
      timestampGranularities
    });

    // Convert Buffer to Blob and then to File
    const audioBlob = new Blob([buffer as any], { type: mimeType });
    const audioFile = new File([audioBlob], filename, { type: mimeType });

    // Call Whisper API with verbose_json format to get word timestamps
    const response = await client.audio.transcriptions.create({
      model: timestampModel, // Use whisper-1, not gpt-4o-mini-transcribe
      file: audioFile,
      language: LANGUAGE,
      response_format: responseFormat,
      timestamp_granularities: timestampGranularities
    });

    const duration = ((performance.now() - startTime) / 1000).toFixed(3);
    console.log(`[TIMING] STT with timestamps (${timestampModel}): ${duration}s`);
    console.log('[STT] Transcription with timestamps:', {
      text: (response as any).text?.substring(0, 60) + '...',
      wordCount: (response as any).words?.length || 0
    });

    return response;
  } catch (error) {
    console.error('[STT] Transcription with timestamps failed:', error);
    throw error;
  }
}

/**
 * Validate audio duration (minimum 0.4s to avoid empty recordings)
 *
 * @param audioBlob - Audio blob to validate
 * @returns True if audio is valid
 */
export function validateAudioDuration(audioBlob: Blob): boolean {
  // Rough estimate: 0.4s of audio should be at least 5-10KB
  const MIN_SIZE_BYTES = 5000;
  return audioBlob.size >= MIN_SIZE_BYTES;
}

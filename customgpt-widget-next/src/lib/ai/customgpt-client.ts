/**
 * CustomGPT API Client
 *
 * Handles all communication with CustomGPT Conversations API.
 * Supports conversation creation, message sending, and streaming responses.
 */

const BASE_URL = 'https://app.customgpt.ai/api/v1';
const PROJECT_ID = process.env.CUSTOMGPT_PROJECT_ID;
const API_KEY = process.env.CUSTOMGPT_API_KEY;
const LANGUAGE = process.env.LANGUAGE || 'en';

if (!PROJECT_ID) {
  throw new Error('CUSTOMGPT_PROJECT_ID environment variable is required');
}
if (!API_KEY) {
  throw new Error('CUSTOMGPT_API_KEY environment variable is required');
}

/**
 * Response types
 */
export interface ConversationData {
  id: number;
  session_id: string;
  project_id: number;
  created_at: string;
}

export interface MessageData {
  id: number;
  user_query: string;
  openai_response: string;
  citations?: number[];
  created_at: string;
  response_feedback?: {
    created_at: string;
    updated_at: string;
    user_id: number;
    reaction: 'liked' | 'disliked' | null;
  };
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  message?: string;
}

export interface StreamData {
  status: 'progress' | 'finish' | 'error';
  message?: string;
  error?: string;
}

/**
 * CustomGPT API Client
 */
export class CustomGPTClient {
  private baseUrl: string;
  private projectId: string;
  private apiKey: string;
  private language: string;

  constructor() {
    this.baseUrl = BASE_URL;
    this.projectId = PROJECT_ID!;
    this.apiKey = API_KEY!;
    this.language = LANGUAGE;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Create a new conversation
   *
   * @returns Conversation data with session_id
   */
  async createConversation(): Promise<ConversationData> {
    const url = `${this.baseUrl}/projects/${this.projectId}/conversations`;

    // CustomGPT API requires a "name" field
    const payload = { name: 'Chat Conversation' };

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<ConversationData> = await response.json();

    if (data.status !== 'success') {
      throw new Error(`Failed to create conversation: ${data.message || 'Unknown error'}`);
    }

    return data.data;
  }

  /**
   * Send a message to a conversation (non-streaming)
   *
   * @param sessionId - The conversation session ID
   * @param userMessage - The user's message text
   * @returns Message response with AI response and citations
   */
  async sendMessage(sessionId: string, userMessage: string): Promise<MessageData> {
    const url = `${this.baseUrl}/projects/${this.projectId}/conversations/${sessionId}/messages`;

    const params = new URLSearchParams({
      stream: 'false',
      lang: this.language,
    });

    const payload = {
      prompt: userMessage,
      response_source: 'default',
    };

    const response = await fetch(`${url}?${params}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<MessageData> = await response.json();

    if (data.status !== 'success') {
      throw new Error(`Failed to send message: ${data.message || 'Unknown error'}`);
    }

    return data.data;
  }

  /**
   * Send a message and stream the response using Server-Sent Events
   *
   * @param sessionId - The conversation session ID
   * @param userMessage - The user's message text
   * @returns AsyncGenerator yielding chunks of the AI response
   */
  async *sendMessageStream(sessionId: string, userMessage: string): AsyncGenerator<string, void, unknown> {
    const url = `${this.baseUrl}/projects/${this.projectId}/conversations/${sessionId}/messages`;

    const params = new URLSearchParams({
      stream: 'true',
      lang: this.language,
    });

    const payload = {
      prompt: userMessage,
      response_source: 'default',
    };

    const response = await fetch(`${url}?${params}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // SSE format: "data: {json}"
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);

            try {
              const data: StreamData = JSON.parse(dataStr);

              // Handle progress events with message chunks
              if (data.status === 'progress' && data.message) {
                yield data.message;
              }

              // Handle finish event (end of stream)
              if (data.status === 'finish') {
                return;
              }

              // Handle error event
              if (data.status === 'error') {
                throw new Error(data.error || 'Stream error occurred');
              }
            } catch (error) {
              if (error instanceof SyntaxError) {
                // Skip malformed JSON
                continue;
              }
              throw error;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get all messages in a conversation
   *
   * @param sessionId - The conversation session ID
   * @returns List of messages in the conversation
   */
  async getConversationMessages(sessionId: string): Promise<MessageData[]> {
    const url = `${this.baseUrl}/projects/${this.projectId}/conversations/${sessionId}/messages`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<MessageData[]> = await response.json();

    if (data.status !== 'success') {
      throw new Error(`Failed to get messages: ${data.message || 'Unknown error'}`);
    }

    return data.data;
  }

  /**
   * Update reaction for a specific message
   *
   * @param sessionId - The conversation session ID
   * @param messageId - The message ID (prompt_id)
   * @param reaction - "liked", "disliked", or null to remove reaction
   * @returns Updated message data with response_feedback
   */
  async updateMessageReaction(
    sessionId: string,
    messageId: number,
    reaction: 'liked' | 'disliked' | null
  ): Promise<MessageData> {
    // Validate reaction value
    if (reaction !== 'liked' && reaction !== 'disliked' && reaction !== null) {
      throw new Error(`Invalid reaction value: ${reaction}. Must be 'liked', 'disliked', or null`);
    }

    const url = `${this.baseUrl}/projects/${this.projectId}/conversations/${sessionId}/messages/${messageId}/feedback`;

    const payload = { reaction };

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to update reaction: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<MessageData> = await response.json();

    if (data.status !== 'success') {
      throw new Error(`Failed to update reaction: ${data.message || 'Unknown error'}`);
    }

    return data.data;
  }

  /**
   * Get citation details
   *
   * @param citationId - The citation ID
   * @returns Citation details
   */
  async getCitationDetails(citationId: number): Promise<any> {
    const url = `${this.baseUrl}/projects/${this.projectId}/citations/${citationId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get citation: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<any> = await response.json();

    if (data.status !== 'success') {
      throw new Error(`Failed to get citation: ${data.message || 'Unknown error'}`);
    }

    return data.data;
  }
}

// Export singleton instance
export const customGPTClient = new CustomGPTClient();

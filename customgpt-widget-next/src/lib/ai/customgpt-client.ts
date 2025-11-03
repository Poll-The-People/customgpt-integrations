/**
 * CustomGPT API Client
 *
 * Handles all communication with CustomGPT Conversations API.
 * Supports conversation creation, message sending, and streaming responses.
 */

import { CUSTOMGPT_CONFIG, LANGUAGE_CONFIG } from '@/config/constants';

const BASE_URL = CUSTOMGPT_CONFIG.apiBaseUrl;
const PROJECT_ID = CUSTOMGPT_CONFIG.projectId;
const API_KEY = CUSTOMGPT_CONFIG.apiKey;
const LANGUAGE = LANGUAGE_CONFIG.default;

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

export interface AgentSettings {
  chatbot_avatar: string | null;
  chatbot_background_type?: string;
  chatbot_background?: string;
  chatbot_background_color?: string;
  default_prompt?: string;
  example_questions: string[];
  response_source?: string;
  chatbot_msg_lang?: string;
  chatbot_color?: string;
  chatbot_toolbar_color?: string;
  persona_instructions?: string;
  citations_answer_source_label_msg?: string;
  citations_sources_label_msg?: string;
  hang_in_there_msg?: string;
  chatbot_siesta_msg?: string;
  is_loading_indicator_enabled?: boolean;
  enable_citations?: number;
  enable_feedbacks?: boolean;
  citations_view_type?: string;
  image_citation_display?: string;
  no_answer_message?: string;
  ending_message?: string;
  try_asking_questions_msg?: string;
  view_more_msg?: string;
  view_less_msg?: string;
  remove_branding?: boolean;
  private_deployment?: boolean;
  enable_recaptcha_for_public_chatbots?: boolean;
  chatbot_model?: string;
  is_selling_enabled?: boolean;
  license_slug?: boolean;
  selling_url?: string;
  can_share_conversation?: boolean;
  can_export_conversation?: boolean;
  hide_sources_from_responses?: boolean;
  input_field_addendum?: string;
  user_avatar?: string;
  spotlight_avatar_enabled?: boolean;
  spotlight_avatar?: string;
  spotlight_avatar_shape?: string;
  spotlight_avatar_type?: string;
  user_avatar_orientation?: string;
  chatbot_title: string;
  chatbot_title_color?: string;
  enable_inline_citations_api?: boolean;
  conversation_time_window?: boolean;
  conversation_retention_period?: string;
  conversation_retention_days?: number;
  enable_agent_knowledge_base_awareness?: boolean;
  markdown_enabled?: boolean;
}

export interface AgentDetails {
  id: number;
  project_name: string;
  sitemap_path?: string;
  is_chat_active: boolean;
  user_id: number;
  team_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  type: string;
  is_shared: boolean;
  shareable_slug?: string;
  shareable_link?: string;
  embed_code?: string;
  live_chat_code?: string;
  are_licenses_allowed?: boolean;
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

    console.log('[CustomGPT] Updating message reaction:', { url, payload });

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Try to get error details from response body
      let errorDetails = `${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        errorDetails = errorBody.data?.message || errorBody.message || errorDetails;
        console.error('[CustomGPT] Feedback API error response:', errorBody);
      } catch {
        // Couldn't parse error body
      }
      throw new Error(`Failed to update reaction: ${errorDetails}`);
    }

    const data: ApiResponse<MessageData> = await response.json();

    if (data.status !== 'success') {
      throw new Error(`Failed to update reaction: ${data.message || 'Unknown error'}`);
    }

    console.log('[CustomGPT] Reaction updated successfully');
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

  /**
   * Get agent settings
   *
   * @returns Agent settings including title, avatar, example questions, etc.
   */
  async getAgentSettings(): Promise<AgentSettings> {
    const url = `${this.baseUrl}/projects/${this.projectId}/settings`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get agent settings: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<AgentSettings> = await response.json();

    if (data.status !== 'success') {
      throw new Error(`Failed to get agent settings: ${data.message || 'Unknown error'}`);
    }

    return data.data;
  }

  /**
   * Get agent details
   *
   * @returns Agent details including name, type, status, etc.
   */
  async getAgentDetails(): Promise<AgentDetails> {
    const url = `${this.baseUrl}/projects/${this.projectId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get agent details: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<AgentDetails> = await response.json();

    if (data.status !== 'success') {
      throw new Error(`Failed to get agent details: ${data.message || 'Unknown error'}`);
    }

    return data.data;
  }
}

// Export singleton instance
export const customGPTClient = new CustomGPTClient();

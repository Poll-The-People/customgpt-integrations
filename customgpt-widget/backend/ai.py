import base64
import hashlib
import json
import logging
import os
import time
import uuid

import requests
from openai import AsyncOpenAI

from retry_utils import retry_async, retry_sync, RETRY_CONFIG_AI
from fallback import execute_fallback_chain, ServiceType, AI_FALLBACK_CHAIN, ai_openai_fallback

AI_COMPLETION_MODEL = os.getenv("AI_COMPLETION_MODEL", "gpt-3.5-turbo")
LANGUAGE = os.getenv("LANGUAGE", "en")
CUSTOMGPT_PROJECT_ID = os.getenv("CUSTOMGPT_PROJECT_ID")
CUSTOMGPT_API_KEY = os.getenv("CUSTOMGPT_API_KEY")
USE_CUSTOMGPT = os.getenv("USE_CUSTOMGPT", "false").lower() == "true"
CUSTOMGPT_STREAM = os.getenv("CUSTOMGPT_STREAM", "true").lower() == "true"
INITIAL_PROMPT = f"You are CustomGPT Widget - a helpful assistant with a voice interface. Keep your responses very succinct and limited to a single sentence since the user is interacting with you through a voice interface. Always provide your responses in the language that corresponds to the ISO-639-1 code: {LANGUAGE}."

# CustomGPT session management (in-memory cache for session IDs)
# Maps conversation_hash -> session_id
customgpt_sessions = {}

# Optimization state (in-memory flag)
_optimization_attempted = False


def _truncate_for_voice(text, max_sentences=2, max_words=50):
    """
    Truncate long text responses to be suitable for voice interface.

    Strategy:
    1. Split by sentences (., !, ?)
    2. Take first 1-2 sentences
    3. Ensure total doesn't exceed max_words
    4. Remove markdown, URLs, and formatting

    Args:
        text: Raw text response
        max_sentences: Maximum number of sentences (default: 2)
        max_words: Maximum total words (default: 50)

    Returns:
        Truncated text suitable for TTS
    """
    import re

    # Remove markdown formatting
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Remove bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # Remove italic
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # Remove links
    text = re.sub(r'http[s]?://\S+', '', text)     # Remove bare URLs
    text = re.sub(r'www\.\S+', '', text)            # Remove www URLs
    text = re.sub(r'#+\s', '', text)                # Remove headers
    text = re.sub(r'\n+', ' ', text)                # Replace newlines with spaces
    text = re.sub(r'\s+', ' ', text)                # Collapse multiple spaces
    text = text.strip()

    # Split into sentences (. ! ?)
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]

    # Take first max_sentences
    result_sentences = []
    total_words = 0

    for sentence in sentences[:max_sentences]:
        words = sentence.split()
        if total_words + len(words) > max_words:
            # Add partial sentence if we haven't added anything yet
            if not result_sentences:
                remaining_words = max_words - total_words
                result_sentences.append(' '.join(words[:remaining_words]))
            break
        result_sentences.append(sentence)
        total_words += len(words)

        # Stop if we've reached max_sentences
        if len(result_sentences) >= max_sentences:
            break

    result = '. '.join(result_sentences)
    if result and not result.endswith('.'):
        result += '.'

    # Log truncation for monitoring
    if len(text) > len(result):
        logging.info(f"Truncated response: {len(text)} chars → {len(result)} chars ({len(text.split())} words → {len(result.split())} words)")

    return result


def _customgpt_api_call_sync(url, params, headers, payload):
    """
    Synchronous CustomGPT API call with retry logic.

    Args:
        url: API endpoint URL
        params: Query parameters
        headers: Request headers
        payload: Request payload

    Returns:
        Response object
    """
    def _make_request():
        # Timeout set to 30s to accommodate CustomGPT's processing time for complex queries
        # stream=CUSTOMGPT_STREAM enables Server-Sent Events for real-time responses
        response = requests.post(url, params=params, json=payload, headers=headers, timeout=30, stream=CUSTOMGPT_STREAM)
        # raise_for_status() triggers retry logic on HTTP errors (4xx, 5xx)
        response.raise_for_status()
        return response

    # Retry with exponential backoff for transient failures (network, rate limits, server errors)
    return retry_sync(
        _make_request,
        config=RETRY_CONFIG_AI,
        operation_name="CustomGPT API"
    )


async def _openai_completion_call(client, api_params):
    """
    OpenAI completion call with retry logic.

    Args:
        client: AsyncOpenAI client
        api_params: API call parameters

    Returns:
        Response object
    """
    return await retry_async(
        client.chat.completions.create,
        **api_params,
        config=RETRY_CONFIG_AI,
        operation_name="OpenAI API"
    )


def _get_or_create_session_id(conversation_thus_far):
    """
    Get or create a CustomGPT session ID based on conversation history.
    Uses conversation hash to maintain consistent session across related messages.

    Design rationale:
    - Hash-based instead of sequential IDs to ensure same conversation always maps to same session
    - Enables stateless backend: multiple requests with same history get same session
    - CustomGPT uses sessions to maintain context and conversation memory

    Cache lifecycle:
    - Stored in-memory (customgpt_sessions dict) for app lifetime
    - Cleared on app restart
    - Hash collisions: Extremely unlikely with MD5 for conversation text (2^128 space)

    Thread safety:
    - Not thread-safe - relies on GIL for dict operations
    - For production with multiple workers, use Redis or distributed cache
    """
    # Generate a hash of the conversation to use as session key
    # If no conversation history, use a default key (new conversation)
    if not conversation_thus_far:
        conversation_key = "new_conversation"
    else:
        # MD5 hash provides consistent key for same conversation content
        # Not for security - just for deterministic session mapping
        conversation_key = hashlib.md5(conversation_thus_far.encode()).hexdigest()

    # Check if we already have a session for this conversation
    if conversation_key not in customgpt_sessions:
        # Create a new session ID
        session_id = str(uuid.uuid4())
        # Store in cache: conversation_hash -> session_id
        customgpt_sessions[conversation_key] = session_id
        logging.info(f"Created new CustomGPT session: {session_id}")
    else:
        # Reuse existing session for this conversation
        session_id = customgpt_sessions[conversation_key]
        logging.debug(f"Reusing CustomGPT session: {session_id}")

    return session_id


def _get_customgpt_settings():
    """
    Get current CustomGPT project settings.
    Returns dict with current settings or None on error.
    """
    try:
        url = f"https://app.customgpt.ai/api/v1/projects/{CUSTOMGPT_PROJECT_ID}/settings"
        headers = {
            "accept": "application/json",
            "authorization": f"Bearer {CUSTOMGPT_API_KEY}"
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        data = response.json()
        if data.get("status") == "success":
            return data.get("data", {})
        return None
    except Exception as e:
        logging.warning(f"Failed to get CustomGPT settings: {e}")
        return None


def _update_customgpt_settings(model, capability):
    """
    Update CustomGPT project settings with new model and capability.
    Returns True if successful (200 response), False otherwise.
    """
    try:
        url = f"https://app.customgpt.ai/api/v1/projects/{CUSTOMGPT_PROJECT_ID}/settings"
        headers = {
            "accept": "application/json",
            "authorization": f"Bearer {CUSTOMGPT_API_KEY}"
        }
        data = {
            "chatbot_model": model,
            "agent_capability": capability
        }

        response = requests.post(url, headers=headers, data=data, timeout=10)

        if response.status_code == 200:
            result = response.json()
            if result.get("status") == "success" and result.get("data", {}).get("updated"):
                return True

        logging.debug(f"Settings update returned status {response.status_code}")
        return False

    except Exception as e:
        logging.debug(f"Settings update failed: {e}")
        return False




def optimize_customgpt_on_startup():
    """
    Optimize CustomGPT settings for fastest responses.

    Strategy:
    1. Check if already attempted (skip if yes)
    2. Get current settings
    3. Try gpt-4o-mini + fastest-responses (fastest available)
    4. Fallback to gpt-4-1-mini + fastest-responses
    5. Fallback to gpt-4o-mini + optimal-choice
    6. Fallback to gpt-4-1-mini + optimal-choice
    7. Keep current settings if all fail

    Only logs when changes are made.
    """
    global _optimization_attempted

    if not USE_CUSTOMGPT or not CUSTOMGPT_PROJECT_ID or not CUSTOMGPT_API_KEY:
        return

    # Skip if already attempted in this process
    if _optimization_attempted:
        logging.debug("CustomGPT already optimized, skipping")
        return

    _optimization_attempted = True

    try:
        # Get current settings
        current_settings = _get_customgpt_settings()
        if not current_settings:
            logging.warning("Could not get current CustomGPT settings, skipping optimization")
            return

        current_model = current_settings.get("chatbot_model", "unknown")
        logging.info(f"CustomGPT current model: {current_model}")

        # Attempt 1: gpt-4o-mini + fastest-responses (potentially fastest)
        logging.debug("Trying gpt-4o-mini + fastest-responses...")
        if _update_customgpt_settings("gpt-4o-mini", "fastest-responses"):
            logging.info("✓ CustomGPT optimized: gpt-4o-mini + fastest-responses")
            return

        # Attempt 2: gpt-4-1-mini + fastest-responses
        logging.debug("Trying gpt-4-1-mini + fastest-responses...")
        if _update_customgpt_settings("gpt-4-1-mini", "fastest-responses"):
            logging.info("✓ CustomGPT optimized: gpt-4-1-mini + fastest-responses")
            return

        # Attempt 3: gpt-4o-mini + optimal-choice
        logging.debug("Trying gpt-4o-mini + optimal-choice...")
        if _update_customgpt_settings("gpt-4o-mini", "optimal-choice"):
            logging.info("✓ CustomGPT optimized: gpt-4o-mini + optimal-choice")
            return

        # Attempt 4: gpt-4-1-mini + optimal-choice
        logging.debug("Trying gpt-4-1-mini + optimal-choice...")
        if _update_customgpt_settings("gpt-4-1-mini", "optimal-choice"):
            logging.info("✓ CustomGPT optimized: gpt-4-1-mini + optimal-choice")
            return

        # All failed, keep current settings
        logging.info(f"CustomGPT optimization not available, keeping current model: {current_model}")

    except Exception as e:
        logging.warning(f"CustomGPT optimization failed: {e}")


async def get_completion(user_prompt, conversation_thus_far):
    overall_start = time.time()

    if _is_empty(user_prompt):
        raise ValueError("empty user prompt received")

    # Build messages array
    prep_start = time.time()
    messages = [{"role": "system", "content": INITIAL_PROMPT}]

    # Decode conversation history
    if conversation_thus_far:
        messages.extend(json.loads(base64.b64decode(conversation_thus_far)))

    messages.append({"role": "user", "content": user_prompt})
    logging.debug("Message preparation took: %.3f seconds", time.time() - prep_start)

    # Call AI model
    api_start = time.time()

    if USE_CUSTOMGPT:
        # Use CustomGPT Conversation API (proper stateful endpoint)
        if not CUSTOMGPT_PROJECT_ID or not CUSTOMGPT_API_KEY:
            raise ValueError("USE_CUSTOMGPT is enabled but CUSTOMGPT_PROJECT_ID or CUSTOMGPT_API_KEY is not set")

        # Get or create session ID for this conversation
        session_id = _get_or_create_session_id(conversation_thus_far or "")

        logging.debug("calling CustomGPT Conversation API (session: %s)", session_id)

        # CustomGPT Conversation API format (from official API docs)
        # Endpoint: /projects/{projectId}/conversations/{sessionId}/messages?stream=false&lang=en
        url = f"https://app.customgpt.ai/api/v1/projects/{CUSTOMGPT_PROJECT_ID}/conversations/{session_id}/messages"

        # Add query parameters as shown in API documentation
        # Use CUSTOMGPT_STREAM env var to control streaming (default: true)
        params = {
            "stream": "true" if CUSTOMGPT_STREAM else "false",
            "lang": LANGUAGE
        }

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Bearer {CUSTOMGPT_API_KEY}"
        }

        # Build request payload (CustomGPT manages conversation internally per session)
        # For the FIRST message in a session, prepend instructions to enforce concise responses
        # CustomGPT doesn't support system messages, so we must include instructions in the prompt
        if not conversation_thus_far:
            # First message - include instructions
            formatted_prompt = f"{INITIAL_PROMPT}\n\nUser question: {user_prompt}"
        else:
            # Follow-up message - just send the prompt (instructions already in session context)
            formatted_prompt = user_prompt

        payload = {
            "response_source": "default",
            "prompt": formatted_prompt
        }

        logging.info(f"[TIMING] CustomGPT request starting: stream={CUSTOMGPT_STREAM}")

        network_start = time.time()
        # Use retry logic for CustomGPT API call
        response = _customgpt_api_call_sync(url, params, headers, payload)
        network_time = time.time() - network_start
        logging.info(f"[TIMING] CustomGPT network request: {network_time:.3f}s")

        # Handle streaming vs non-streaming responses
        if CUSTOMGPT_STREAM:
            # CustomGPT uses SSE (Server-Sent Events) format
            # Format: event: type\ndata: {...}\n\n
            # OPTIMIZATION: Stop early once we have enough content for voice (2 sentences ~50 words)
            raw_completion = ""
            line_count = 0
            current_event = None
            MAX_WORDS_FOR_VOICE = 60  # Stop after collecting ~2 sentences
            sentence_count = 0

            for line in response.iter_lines():
                if line:
                    line_count += 1
                    line_str = line.decode('utf-8')

                    # Log first 10 lines for monitoring
                    if line_count <= 10:
                        logging.info(f"Stream line {line_count}: {line_str[:200]}")

                    # Parse SSE format
                    if line_str.startswith('event: '):
                        current_event = line_str[7:]  # Remove 'event: ' prefix
                    elif line_str.startswith('data: '):
                        try:
                            data_json = json.loads(line_str[6:])  # Remove 'data: ' prefix

                            # CustomGPT streaming format
                            if 'status' in data_json:
                                status = data_json['status']

                                if status == 'progress' and 'message' in data_json:
                                    # Accumulate message chunks
                                    message = data_json['message']
                                    if message:
                                        raw_completion += message

                                        # EARLY STOP: Check if we have enough content
                                        # Count sentences (periods, exclamation marks, question marks)
                                        if message in '.!?':
                                            sentence_count += 1

                                        word_count = len(raw_completion.split())

                                        # Stop early if we have 2+ complete sentences OR 60+ words
                                        if sentence_count >= 2 or word_count >= MAX_WORDS_FOR_VOICE:
                                            logging.info(f"Early stop: {sentence_count} sentences, {word_count} words collected at line {line_count}")
                                            break

                                elif status == 'completed' and 'openai_response' in data_json:
                                    # Final response
                                    raw_completion = data_json['openai_response']
                                    logging.info(f"Received completed event with response")
                                    break

                            # Also check for direct response fields
                            elif 'openai_response' in data_json:
                                raw_completion = data_json['openai_response']
                                break

                        except json.JSONDecodeError as e:
                            logging.debug(f"JSON decode error: {e}")
                            continue

            stream_time = time.time() - network_start
            logging.info(f"[TIMING] Streaming completed: {stream_time:.3f}s ({line_count} lines, {len(raw_completion)} chars)")

            if not raw_completion:
                logging.warning("No response received from streaming API - falling back to non-streaming")
                # Fallback: try parsing the entire response as JSON
                try:
                    response_text = response.content.decode('utf-8')
                    # Try to find JSON response in the content
                    import re
                    json_matches = re.findall(r'\{[^}]+\}', response_text)
                    for match in json_matches:
                        try:
                            data = json.loads(match)
                            if 'openai_response' in data:
                                raw_completion = data['openai_response']
                                break
                        except:
                            continue
                except:
                    pass

                if not raw_completion:
                    raw_completion = "I'm sorry, I couldn't process that."
        else:
            # Non-streaming mode: parse JSON response
            res_data = response.json()

            # Extract the response text from CustomGPT's format
            # CustomGPT returns: {"data": {"openai_response": "...", ...}}
            if "data" in res_data and "openai_response" in res_data["data"]:
                raw_completion = res_data["data"]["openai_response"]
            else:
                # Fallback for different response structures
                logging.warning(f"Unexpected CustomGPT response structure: {res_data}")
                raw_completion = str(res_data.get("data", {}).get("response", "I'm sorry, I couldn't process that."))

        # CRITICAL FIX: Truncate verbose CustomGPT responses for voice interface
        # CustomGPT's agent settings override our prompt instructions, so we must
        # post-process the response to keep it concise for TTS
        truncate_start = time.time()
        completion = _truncate_for_voice(raw_completion)
        truncate_time = time.time() - truncate_start
        logging.info(f"[TIMING] Truncation: {truncate_time:.3f}s")

    else:
        # Use standard OpenAI API with AsyncOpenAI client (v2.6.1)
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        logging.debug("calling %s with %d messages", AI_COMPLETION_MODEL, len(messages))

        # Build API call parameters
        api_params = {
            "model": AI_COMPLETION_MODEL,
            "messages": messages,
            "timeout": 15.0,
            "max_tokens": 150  # Limit response length for faster generation
        }

        # Use retry logic for OpenAI API call
        response = await _openai_completion_call(client, api_params)
        completion = response.choices[0].message.content

    api_time = time.time() - api_start
    logging.info(f"[TIMING] API call: {api_time:.3f}s")

    total_time = time.time() - overall_start
    logging.info(f'[TIMING] AI total: {total_time:.3f}s | Response: {completion}')

    return completion


def _is_empty(user_prompt: str):
    return not user_prompt or user_prompt.isspace()

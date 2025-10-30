import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { preprocessMarkdown } from '../utils/markdownPreprocessor';
import { useTTS } from '../hooks/useTTS';
import { useAgentSettings } from '../hooks/useAgentSettings';
import { stripMarkdown } from '../utils/textProcessing';
import { SystemCapabilities } from '../hooks/useCapabilities';
import './ChatContainer.css';

interface ResponseFeedback {
  created_at: string;
  updated_at: string;
  user_id: number;
  reaction: 'liked' | 'disliked' | null;
}

interface Citation {
  id: number;
  url: string;
  title: string;
  description: string | null;  // Can be null from API
  image?: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  id: string;
  response_feedback?: ResponseFeedback;
  citations?: number[];  // Array of citation IDs from API
  citationDetails?: Citation[];  // Fetched citation metadata
}

interface ChatContainerProps {
  onVoiceMode: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  capabilities: SystemCapabilities;
}

const ChatContainer = ({ onVoiceMode, theme, capabilities }: ChatContainerProps) => {
  // Use capabilities from backend instead of environment variables
  const enableVoiceMode = capabilities.voice_mode_enabled;
  const enableSTT = capabilities.stt_enabled;
  const enableTTS = capabilities.tts_enabled;

  // Fetch agent settings dynamically
  const { settings: agentSettings, loading: settingsLoading } = useAgentSettings();

  const assistantName = agentSettings?.chatbot_title || 'AI Assistant';
  const userName = agentSettings?.user_name || 'You';
  const avatarUrl = agentSettings?.chatbot_avatar;
  const exampleQuestions = agentSettings?.example_questions || [];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // TTS hook for text-to-speech functionality
  const { status: ttsStatus, play: playTTS, stop: stopTTS, currentMessageId: ttsCurrentMessageId } = useTTS();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',     // Prevents scrolling parent page when in iframe
      inline: 'nearest'     // Prevents horizontal scroll
    });
  }, [messages]);

  // Auto-expand textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Max height of 200px (about 8 lines)
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [input]);

  // Create conversation on mount
  useEffect(() => {
    const createConversation = async () => {
      try {
        const response = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Failed to create conversation');

        const data = await response.json();
        setSessionId(data.session_id);
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    };

    createConversation();
  }, []);

  // Fetch citation details in parallel
  const fetchCitationDetails = async (citationIds: number[]): Promise<Citation[]> => {
    if (!citationIds || citationIds.length === 0) {
      return [];
    }

    try {
      // Fetch all citations in parallel
      const citationPromises = citationIds.map(id =>
        fetch(`/api/chat/citations/${id}`)
          .then(res => {
            if (!res.ok) {
              console.error(`Failed to fetch citation ${id}: ${res.status}`);
              return null;
            }
            return res.json();
          })
          .catch(err => {
            console.error(`Error fetching citation ${id}:`, err);
            return null;
          })
      );

      const results = await Promise.all(citationPromises);

      // Filter out failed requests and return valid citations
      const validCitations = results.filter((c): c is Citation => c !== null);

      return validCitations;
    } catch (error) {
      console.error('Failed to fetch citations:', error);
      return [];
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
      id: `user-${Date.now()}`
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Use non-streaming endpoint for better markdown rendering
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: currentInput,
          stream: false
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      // Preprocess markdown before displaying
      const processedContent = preprocessMarkdown(data.openai_response);

      // Create assistant message with API ID and empty content initially
      const assistantMessageId = `msg-${data.id}`;
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        id: assistantMessageId,
        response_feedback: data.response_feedback || null,
        citations: data.citations || [],
        citationDetails: []  // Will be populated after animation
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);

      // Animate word-by-word
      const words = processedContent.split(' ');
      let currentText = '';

      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? '' : ' ') + words[i];

        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: currentText }
              : msg
          )
        );

        // Delay between words (30ms for smooth animation)
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      // Fetch citation details after text animation completes
      if (data.citations && data.citations.length > 0) {
        const citationDetails = await fetchCitationDetails(data.citations);
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, citationDetails }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.',
        timestamp: Date.now(),
        id: `error-${Date.now()}`
      }]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Use secure backend endpoint instead of calling OpenAI directly
      // This prevents exposing API keys in the frontend
      const response = await fetch('/api/chat/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Transcription failed');

      const data = await response.json();
      setInput(data.transcript);
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleExpanded = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleTTSClick = (content: string, messageId: string) => {
    if (ttsCurrentMessageId === messageId && ttsStatus === 'playing') {
      // If currently playing this message, stop it
      stopTTS();
    } else {
      // Play full message content with markdown stripped
      const textToPlay = stripMarkdown(content);
      playTTS(textToPlay, messageId);
    }
  };

  const handleReactionClick = async (messageId: string, reaction: 'liked' | 'disliked') => {
    if (!sessionId || reactingMessageId) return;

    setReactingMessageId(messageId);

    // Get current message and reaction
    const currentMessage = messages.find(m => m.id === messageId);
    const currentReaction = currentMessage?.response_feedback?.reaction;

    // Toggle logic: if same reaction, remove it; otherwise set new reaction
    const newReaction = currentReaction === reaction ? null : reaction;

    // Optimistic update
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? {
            ...msg,
            response_feedback: {
              created_at: msg.response_feedback?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
              user_id: msg.response_feedback?.user_id || 1,
              reaction: newReaction
            }
          }
        : msg
    ));

    try {
      // Extract numeric message ID from the string ID (format: "msg-{id}")
      const numericId = parseInt(messageId.replace('msg-', ''));

      const response = await fetch(`/api/chat/messages/${numericId}/feedback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          reaction: newReaction
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update reaction');
      }

      const data = await response.json();

      // Update with server response
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, response_feedback: data.response_feedback }
          : msg
      ));

    } catch (error) {
      console.error('Failed to update reaction:', error);

      // Revert optimistic update
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              response_feedback: currentMessage?.response_feedback || null
            }
          : msg
      ));

      // Show error toast
      alert('Failed to update reaction. Please try again.');
    } finally {
      setReactingMessageId(null);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Less than 1 minute
    if (diffMins < 1) {
      return 'Just now';
    }
    // Less than 60 minutes
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    // Less than 24 hours
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    // Less than 7 days
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    // Older messages show full date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getFullTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const shouldTruncate = (content: string) => {
    return content.length > 300;
  };

  const getTruncatedContent = (content: string) => {
    return content.slice(0, 300) + '...';
  };

  const handleStarterQuestionClick = (question: string) => {
    if (isLoading || !sessionId) return;

    // Set the question as input and submit
    setInput(question);

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: question,
      timestamp: Date.now(),
      id: `user-${Date.now()}`
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Send to AI (same logic as handleSend)
    (async () => {
      try {
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            message: question,
            stream: false
          })
        });

        if (!response.ok) throw new Error('Failed to get response');

        const data = await response.json();

        const processedContent = preprocessMarkdown(data.openai_response);

        const assistantMessageId = `msg-${data.id}`;
        const assistantMessage: Message = {
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          id: assistantMessageId,
          response_feedback: data.response_feedback || null,
          citations: data.citations || [],
          citationDetails: []  // Will be populated after animation
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);

        // Animate word-by-word
        const words = processedContent.split(' ');
        let currentText = '';

        for (let i = 0; i < words.length; i++) {
          currentText += (i === 0 ? '' : ' ') + words[i];

          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: currentText }
                : msg
            )
          );

          await new Promise(resolve => setTimeout(resolve, 30));
        }

        // Fetch citation details after text animation completes
        if (data.citations && data.citations.length > 0) {
          const citationDetails = await fetchCitationDetails(data.citations);
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, citationDetails }
                : msg
            )
          );
        }
      } catch (error) {
        console.error('Chat error:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, there was an error processing your request.',
          timestamp: Date.now(),
          id: `error-${Date.now()}`
        }]);
        setIsLoading(false);
      }
    })();
  };

  const handleRefresh = async () => {
    try {
      // Clear current messages
      setMessages([]);

      // Create a new conversation
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to create conversation');

      const data = await response.json();
      setSessionId(data.session_id);
    } catch (error) {
      console.error('Failed to start new conversation:', error);
      alert('Failed to start new conversation. Please try again.');
    }
  };

  return (
    <div className={`chat-container ${theme === 'light' ? 'light-theme' : ''}`}>
      {settingsLoading && (
        <div className="loading-screen">
          <div className="loading-spinner">
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" className="spinner-icon">
              <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
            </svg>
          </div>
          <p className="loading-text">Loading...</p>
        </div>
      )}

      {!settingsLoading && assistantName && (
        <div className="chat-header">
          <h1>{assistantName}</h1>
          <button
            className="refresh-button"
            onClick={handleRefresh}
            title="Refresh page"
            aria-label="Refresh page"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
        </div>
      )}

      <div
        className="chat-messages"
        ref={messagesContainerRef}
      >
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-content">
              {!settingsLoading && avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={assistantName}
                  className="empty-state-avatar"
                  onError={(e) => {
                    // Hide image on load error
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {!settingsLoading && (
                <>
                  <h2>{assistantName}</h2>
                  <p>Ask me anything to get started</p>
                </>
              )}
            </div>
            {!settingsLoading && exampleQuestions.length > 0 && (
              <div className="starter-questions">
                <p className="starter-questions-label">Suggested questions</p>
                <div className="starter-questions-grid">
                  {exampleQuestions.map((question, index) => (
                    <button
                      key={index}
                      className="starter-question"
                      onClick={() => handleStarterQuestionClick(question)}
                      disabled={isLoading || !sessionId}
                      aria-label={`Suggested question: ${question}`}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {messages.map((msg) => {
          const isExpanded = expandedMessages.has(msg.id);
          const needsTruncation = shouldTruncate(msg.content);
          const displayContent = needsTruncation && !isExpanded
            ? getTruncatedContent(msg.content)
            : msg.content;

          return (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar" title={msg.role === 'user' ? userName : assistantName}>
                {msg.role === 'user' ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={assistantName}
                    width="36"
                    height="36"
                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                    onError={(e) => {
                      // Fallback to default icon on error
                      e.currentTarget.style.display = 'none';
                      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                      svg.setAttribute('viewBox', '0 0 24 24');
                      svg.setAttribute('fill', 'currentColor');
                      svg.setAttribute('width', '36');
                      svg.setAttribute('height', '36');
                      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                      path1.setAttribute('d', 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z');
                      const circle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                      circle1.setAttribute('cx', '12');
                      circle1.setAttribute('cy', '10');
                      circle1.setAttribute('r', '1.5');
                      const circle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                      circle2.setAttribute('cx', '8');
                      circle2.setAttribute('cy', '10');
                      circle2.setAttribute('r', '1.5');
                      const circle3 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                      circle3.setAttribute('cx', '16');
                      circle3.setAttribute('cy', '10');
                      circle3.setAttribute('r', '1.5');
                      svg.appendChild(path1);
                      svg.appendChild(circle1);
                      svg.appendChild(circle2);
                      svg.appendChild(circle3);
                      e.currentTarget.parentNode?.appendChild(svg);
                    }}
                  />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                    <circle cx="12" cy="10" r="1.5"/>
                    <circle cx="8" cy="10" r="1.5"/>
                    <circle cx="16" cy="10" r="1.5"/>
                  </svg>
                )}
              </div>
              <div className="message-wrapper">
                <div className="message-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                  >
                    {displayContent}
                  </ReactMarkdown>
                  {needsTruncation && (
                    <button
                      className="read-more-inline"
                      onClick={() => toggleExpanded(msg.id)}
                    >
                      {isExpanded ? 'Show Less ↑' : 'Read More ↓'}
                    </button>
                  )}
                  <span
                    className="message-timestamp"
                    title={getFullTimestamp(msg.timestamp)}
                  >
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>

                {/* Citations Section */}
                {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                  <div className="message-citations">
                    <button
                      className="citations-header"
                      onClick={() => {
                        setExpandedCitations(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(msg.id)) {
                            newSet.delete(msg.id);
                          } else {
                            newSet.add(msg.id);
                          }
                          return newSet;
                        });
                      }}
                      aria-expanded={expandedCitations.has(msg.id)}
                    >
                      <span aria-hidden="true">📚</span>
                      <span>SOURCES</span>
                      <span className="citations-count">({msg.citations.length})</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="16"
                        height="16"
                        className={`citations-toggle-icon ${expandedCitations.has(msg.id) ? 'expanded' : ''}`}
                      >
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                      </svg>
                    </button>

                    {expandedCitations.has(msg.id) && (
                      <>
                        {/* Loading State */}
                        {!msg.citationDetails || msg.citationDetails.length === 0 ? (
                          <div className="citations-loading">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" className="spinner">
                              <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                            </svg>
                            <span>Loading sources...</span>
                          </div>
                        ) : (
                          <div className="citations-list" role="list">
                        {msg.citationDetails.map((citation, index) => (
                          <a
                            key={citation.id}
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="citation-card"
                            role="listitem"
                            aria-label={`Source ${index + 1}: ${citation.title}`}
                          >
                            {citation.image && (
                              <img
                                src={citation.image}
                                alt={citation.title}
                                className="citation-image"
                                loading="lazy"
                              />
                            )}
                            <div className="citation-content">
                              <div className="citation-number">[{index + 1}]</div>
                              <h4 className="citation-title">{citation.title}</h4>
                              {citation.description && (
                                <p className="citation-description">{citation.description}</p>
                              )}
                              <span className="citation-url">
                                {new URL(citation.url).hostname} ↗
                              </span>
                            </div>
                          </a>
                        ))}
                          </div>
                        )}

                        {/* Partial Failure Warning */}
                        {msg.citationDetails && msg.citationDetails.length > 0 && msg.citationDetails.length < msg.citations.length && (
                          <div className="citations-warning">
                            ⚠️ {msg.citations.length - msg.citationDetails.length} source{msg.citations.length - msg.citationDetails.length !== 1 ? 's' : ''} unavailable
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="message-actions">
                  {msg.role === 'assistant' && (
                    <>
                      <button
                        className="action-button copy-button"
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        title="Copy to clipboard"
                      >
                        {copiedMessageId === msg.id ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                          </svg>
                        )}
                      </button>
                      {enableTTS && (
                        <button
                          className={`action-button tts-button ${ttsCurrentMessageId === msg.id ? 'active' : ''}`}
                          onClick={() => handleTTSClick(msg.content, msg.id)}
                          title={ttsCurrentMessageId === msg.id && ttsStatus === 'playing' ? 'Stop' : 'Listen'}
                          disabled={ttsStatus === 'loading' && ttsCurrentMessageId === msg.id}
                        >
                          {ttsCurrentMessageId === msg.id && ttsStatus === 'loading' ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" className="spinner">
                              <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                            </svg>
                          ) : ttsCurrentMessageId === msg.id && ttsStatus === 'playing' ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                            </svg>
                          )}
                        </button>
                      )}
                      <button
                        className={`action-button reaction-button liked ${msg.response_feedback?.reaction === 'liked' ? 'active' : ''}`}
                        onClick={() => handleReactionClick(msg.id, 'liked')}
                        title="Like this response"
                        disabled={reactingMessageId === msg.id}
                        aria-label="Like this response"
                        aria-pressed={msg.response_feedback?.reaction === 'liked'}
                      >
                        {reactingMessageId === msg.id ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" className="spinner">
                            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                          </svg>
                        )}
                      </button>
                      <button
                        className={`action-button reaction-button disliked ${msg.response_feedback?.reaction === 'disliked' ? 'active' : ''}`}
                        onClick={() => handleReactionClick(msg.id, 'disliked')}
                        title="Dislike this response"
                        disabled={reactingMessageId === msg.id}
                        aria-label="Dislike this response"
                        aria-pressed={msg.response_feedback?.reaction === 'disliked'}
                      >
                        {reactingMessageId === msg.id ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" className="spinner">
                            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
                          </svg>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={assistantName}
                  width="36"
                  height="36"
                  style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                  <circle cx="12" cy="10" r="1.5"/>
                  <circle cx="8" cy="10" r="1.5"/>
                  <circle cx="16" cy="10" r="1.5"/>
                </svg>
              )}
            </div>
            <div className="message-wrapper">
              <div className="message-header">
                <span className="message-sender">AI Assistant</span>
              </div>
              <div className="message-content">
                <div className="typing">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="input-wrapper">
          {enableSTT && (
            <button
              className={`mic-button-inline ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}
              onClick={toggleRecording}
              disabled={isLoading || isTranscribing}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isTranscribing ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <circle cx="12" cy="12" r="10" opacity="0.3"/>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              ) : isRecording ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              )}
            </button>
          )}
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isTranscribing ? "Transcribing..." : "Type your message..."}
            rows={1}
            disabled={isLoading || isTranscribing}
          />
        </div>
        <button
          className={`send-button ${input.trim() ? 'has-text' : ''}`}
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
        {enableVoiceMode && (
          <button
            className="voice-mode-button-minimal"
            onClick={onVoiceMode}
            title="Voice Conversation Mode"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;

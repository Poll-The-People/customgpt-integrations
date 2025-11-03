'use client';

import { useMicVADWrapper } from '@/hooks/useMicVADWrapper';
import RotateLoader from 'react-spinners/RotateLoader';
import { particleActions } from '@/lib/particle-manager';
import { useState, useEffect, useRef } from 'react';
import Canvas from '@/components/Canvas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { SystemCapabilities } from '@/hooks/useCapabilities';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface VoiceModeProps {
  onChatMode: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  capabilities: SystemCapabilities;
}

const VoiceMode = ({ onChatMode, capabilities }: VoiceModeProps) => {
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Note: capabilities are validated in App.tsx before this component renders
    // Voice mode will only be accessible if capabilities.voice_mode_enabled is true

    // Get primary color from CSS variables
    const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary').trim() || '#8b5cf6';

    // Capture VAD instance for lifecycle management
    const vad = useMicVADWrapper(setLoading);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Listen for caption updates from speech-manager and expose particle actions
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Expose particle actions to speech-manager
            (window as any).particleActions = particleActions;

            // Track current blob URL for cleanup
            let currentBlobUrl: string | undefined;

            // Caption update handler
            (window as any).updateCaptions = (text: string, audioUrl?: string) => {
                if (text) {
                    // Add new AI message
                    setMessages(prev => [...prev, { role: 'assistant', content: text }]);
                    setIsPlaying(true);

                    // Track blob URL for cleanup
                    if (audioUrl?.startsWith('blob:')) {
                        currentBlobUrl = audioUrl;
                    }
                } else {
                    // Audio finished playing
                    setIsPlaying(false);

                    // Cleanup blob URL
                    if (currentBlobUrl) {
                        URL.revokeObjectURL(currentBlobUrl);
                        currentBlobUrl = undefined;
                    }
                }
            };

            // User message handler
            (window as any).addUserMessage = (text: string) => {
                if (text) {
                    setMessages(prev => [...prev, { role: 'user', content: text }]);
                }
            };
        }

        return () => {
            if (typeof window !== 'undefined') {
                delete (window as any).particleActions;
                delete (window as any).updateCaptions;
                delete (window as any).addUserMessage;
            }
        };
    }, []);

    const handleStop = () => {
        // Stop any playing audio using the global stopAudio function
        if ((window as any).stopAudio) {
            (window as any).stopAudio();
        }
        setIsPlaying(false);
    };

    const handleChatMode = () => {
        // Pause VAD when switching to chat mode
        if (vad?.pause) {
            vad.pause();
        }
        onChatMode();
    };

    // Cleanup VAD on component unmount
    useEffect(() => {
        return () => {
            // Pause VAD to stop microphone access when component unmounts
            if (vad?.pause) {
                vad.pause();
            }
        };
    }, []); // Empty deps - runs only on unmount

    if (loading) {
        return (
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                width: "100vw",
            }}>
                <RotateLoader
                    loading={loading}
                    color={primaryColor}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                />
            </div>
        );
    }

    return (
        <>
            {/* Particle Animation Canvas */}
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%'
            }}>
                <Canvas draw={particleActions.draw}/>
            </div>

            {/* Back to Chat Button */}
            <button className="back-to-chat-button" onClick={handleChatMode}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
                Back to Chat
            </button>

            {/* Scrollable Conversation History */}
            {messages.length > 0 && (
                <div className="voice-captions-container">
                    <div className="voice-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`voice-message ${msg.role}`}>
                                <div className="voice-message-content">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkBreaks]}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )}

            {/* Stop Button - shown when audio is playing */}
            {isPlaying && (
                <button className="stop-button" onClick={handleStop}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2"/>
                    </svg>
                    Stop
                </button>
            )}
        </>
    );
}

export default VoiceMode;

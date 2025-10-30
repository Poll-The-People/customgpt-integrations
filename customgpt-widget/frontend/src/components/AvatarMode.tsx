/**
 * AvatarMode Component - 3D talking avatar with lip-sync
 */

import React, { useRef, useEffect, memo } from 'react';
import { useTalkingHead } from '../hooks/useTalkingHead';
import { AvatarModeProps } from '../types/avatar.d';
import './AvatarMode.css';

const AvatarModeComponent: React.FC<AvatarModeProps> = ({
  audioUrl,
  transcript,
  onError,
  onReady
}) => {
  // TalkingHead expects a container element, not a canvas
  // It creates its own WebGLRenderer canvas and appends it to this container
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    isReady,
    isLoading,
    isSpeaking,
    error,
    speak,
    setListening,
    setProcessing,
    setIdle
  } = useTalkingHead(containerRef);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Handle ready state
  useEffect(() => {
    if (isReady && onReady) {
      onReady();
    }
  }, [isReady, onReady]);

  // Expose avatar state methods globally for speech-manager integration
  useEffect(() => {
    if (isReady) {
      console.log('[AvatarMode] 🌐 Exposing avatar state methods globally');
      (window as any).avatarSetListening = setListening;
      (window as any).avatarSetProcessing = setProcessing;
      (window as any).avatarSetIdle = setIdle;
    }

    return () => {
      // Cleanup on unmount
      delete (window as any).avatarSetListening;
      delete (window as any).avatarSetProcessing;
      delete (window as any).avatarSetIdle;
    };
  }, [isReady, setListening, setProcessing, setIdle]);

  // Speak when audio and transcript are provided
  useEffect(() => {
    console.log('[AvatarMode] Effect triggered:', {
      audioUrl: audioUrl ? `${audioUrl.substring(0, 50)}...` : null,
      transcript: transcript ? `${transcript.substring(0, 50)}...` : null,
      isReady,
      isSpeaking
    });

    if (audioUrl && transcript && isReady && !isSpeaking) {
      console.log('[AvatarMode] 🎤 All conditions met - calling speak()');
      speak(audioUrl, transcript);
    } else {
      console.log('[AvatarMode] ⏸️ Conditions not met:', {
        hasAudioUrl: !!audioUrl,
        hasTranscript: !!transcript,
        isReady,
        notSpeaking: !isSpeaking
      });
    }
  }, [audioUrl, transcript, isReady, isSpeaking, speak]);

  return (
    <div className="avatar-mode-container">
      {/* Loading state */}
      {isLoading && (
        <div className="avatar-loading">
          <div className="avatar-spinner"></div>
          <p>Loading avatar...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="avatar-error">
          <p>⚠️ {error.message}</p>
          {error.fallbackToParticles && (
            <p className="avatar-error-hint">Switching to particle mode...</p>
          )}
        </div>
      )}

      {/* Avatar container - TalkingHead will append its own canvas here */}
      <div
        ref={containerRef}
        className={`avatar-container ${isLoading ? 'avatar-container--loading' : ''}`}
        aria-label="AI assistant avatar"
        role="img"
      />

      {/* Screen reader text for accessibility */}
      {transcript && (
        <span className="sr-only" aria-live="polite">
          {transcript}
        </span>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="avatar-speaking-indicator">
          <div className="pulse-dot"></div>
          <span>Speaking...</span>
        </div>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders that cause avatar disposal
// Custom comparison function to prevent remounting when parent re-renders
const arePropsEqual = (prevProps: AvatarModeProps, nextProps: AvatarModeProps) => {
  // Only re-render if audioUrl or transcript actually changed
  // Ignore onError and onReady callbacks since they're wrapped in useCallback
  return prevProps.audioUrl === nextProps.audioUrl &&
         prevProps.transcript === nextProps.transcript;
};

export const AvatarMode = memo(AvatarModeComponent, arePropsEqual);

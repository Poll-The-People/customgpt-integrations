'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useCapabilities } from '@/hooks/useCapabilities';

// Dynamic imports to avoid SSR issues with window/document
const ChatContainer = dynamic(() => import('@/components/ChatContainer'), { ssr: false });
const VoiceMode = dynamic(() => import('@/components/VoiceMode'), { ssr: false });

export default function Home() {
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Fetch system capabilities
  const { capabilities, loading, error } = useCapabilities();

  // Apply theme class to document.body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Loading screen
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading system capabilities...</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error || !capabilities) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-2">
            Failed to load system capabilities. Please refresh the page.
          </p>
          <p className="text-sm text-gray-500">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {mode === 'chat' ? (
        <ChatContainer
          onVoiceMode={() => setMode('voice')}
          theme={theme}
          setTheme={setTheme}
          capabilities={capabilities}
        />
      ) : (
        <VoiceMode
          onChatMode={() => setMode('chat')}
          theme={theme}
          setTheme={setTheme}
          capabilities={capabilities}
        />
      )}
    </>
  );
}

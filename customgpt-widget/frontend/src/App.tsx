import { useState, useEffect } from "react";
import ChatContainer from "./components/ChatContainer";
import VoiceMode from "./components/VoiceMode";
import { useCapabilities } from "./hooks/useCapabilities";

const App = () => {
    const [mode, setMode] = useState<'chat' | 'voice'>('chat');
    const [theme, setTheme] = useState<'light' | 'dark'>(
        (import.meta.env.VITE_UI_THEME as 'light' | 'dark') || 'dark'
    );

    // Fetch system capabilities
    const { capabilities, loading, error } = useCapabilities();

    // Apply theme class to document.body for global access
    useEffect(() => {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }, [theme]);

    // Show loading screen while fetching capabilities
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>Loading system capabilities...</p>
            </div>
        );
    }

    // Show error screen if capabilities fetch failed
    if (error || !capabilities) {
        return (
            <div className="loading-screen">
                <p style={{ color: 'var(--color-error)' }}>
                    Failed to load system capabilities. Please refresh the page.
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {error || 'Unknown error'}
                </p>
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

export default App;

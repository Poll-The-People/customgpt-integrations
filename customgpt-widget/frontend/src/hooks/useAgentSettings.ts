import { useState, useEffect } from 'react';

interface AgentSettings {
  chatbot_avatar: string | null;
  chatbot_title: string;
  user_name: string;
  example_questions: string[];
}

export const useAgentSettings = () => {
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/agent/settings');

        if (!response.ok) {
          throw new Error('Failed to fetch agent settings');
        }

        const data = await response.json();
        setSettings(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching agent settings:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Set default values on error
        setSettings({
          chatbot_avatar: null,
          chatbot_title: 'AI Assistant',
          user_name: 'You',
          example_questions: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading, error };
};

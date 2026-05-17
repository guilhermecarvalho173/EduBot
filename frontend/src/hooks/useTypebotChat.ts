import { useState, useCallback, useRef } from 'react';

interface UseTypebotChatOptions {
  typebotId?: string;
}

export interface ChatButton {
  id: string;
  content: string;
}

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  buttons?: ChatButton[];
}

export function useTypebotChat(options?: UseTypebotChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      setLoading(true);
      setError(null);

      const userMsg: ChatMessage = {
        role: 'user',
        content: userMessage.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const currentSessionId = sessionIdRef.current;

        const response = await fetch('http://localhost:9999/.netlify/functions/typebot-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage.trim(),
            sessionId: currentSessionId,
            typebotId: options?.typebotId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.sessionId) {
          setSessionId(data.sessionId);
          sessionIdRef.current = data.sessionId;
        }

        const botMsg: ChatMessage = {
          role: 'bot',
          content: data.response || '',
          timestamp: new Date(),
          buttons: data.buttons || [],
        };

        setMessages((prev) => [...prev, botMsg]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao comunicar com o bot';
        setError(errorMessage);
        console.error('[useTypebotChat] Erro:', err);
      } finally {
        setLoading(false);
      }
    },
    [options?.typebotId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    sessionIdRef.current = null;
    setError(null);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearMessages,
    resetError,
    sessionId,
  };
}

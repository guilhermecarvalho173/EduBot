import { useState, useCallback } from 'react';

interface UseTypebotChatOptions {
  typebotId?: string;
}

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export function useTypebotChat(options?: UseTypebotChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      setLoading(true);
      setError(null);

      try {
        // Adiciona mensagem do usuário localmente
        const userMsg: ChatMessage = {
          role: 'user',
          content: userMessage.trim(),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);

        // Chamada para Netlify Function
        const response = await fetch('/.netlify/functions/typebot-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.trim(),
            sessionId: sessionId,
            typebotId: options?.typebotId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Atualiza sessionId
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }

        // Adiciona resposta do bot
        const botMsg: ChatMessage = {
          role: 'bot',
          content: data.response || 'Desculpe, não consegui processar sua mensagem.',
          timestamp: new Date(),
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
    [sessionId, options?.typebotId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
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

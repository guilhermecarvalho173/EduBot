import { useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { useTypebotChat } from '../hooks/useTypebotChat';
import '../styles/ChatWindow.css';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  typebotId?: string;
  initialMessage?: string;
}

export function ChatWindow({ isOpen, onClose, typebotId, initialMessage }: ChatWindowProps) {
  const { messages, loading, error, sendMessage, clearMessages, resetError } = useTypebotChat({ typebotId });
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Inicia a conversa ao abrir o chat
  useEffect(() => {
    if (isOpen && !startedRef.current) {
      startedRef.current = true;
      // Se veio de um card, envia o tema diretamente; senão envia "Olá"
      sendMessage(initialMessage || 'Olá');
    }
    // Ao fechar, reseta para permitir nova conversa na próxima abertura
    if (!isOpen) {
      startedRef.current = false;
      clearMessages();
    }
  }, [isOpen, initialMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = inputRef.current?.value.trim();
    if (message) {
      sendMessage(message);
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus();
      }
    }
  };

  const handleButtonClick = (content: string) => {
    sendMessage(content);
  };

  if (!isOpen) return null;

  const lastBotMessage = [...messages].reverse().find((m) => m.role === 'bot');
  const activeButtons = lastBotMessage?.buttons ?? [];

  return (
    <div className="chat-window-overlay" onClick={onClose}>
      <div className="chat-window" onClick={(e) => e.stopPropagation()}>

        <div className="chat-window-header">
          <div className="chat-header-content">
            <h2>EduBot Chat</h2>
            <span className="chat-subtitle">Assistente Virtual USCS</span>
          </div>
          <button className="chat-close-button" onClick={onClose} aria-label="Fechar chat">
            <X size={20} />
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message chat-message-${msg.role}`}>
              {msg.content && (
                <div className="message-content">{msg.content}</div>
              )}
              <span className="message-time">
                {msg.timestamp.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}

          {!loading && activeButtons.length > 0 && (
            <div className="chat-buttons">
              {activeButtons.map((btn) => (
                <button
                  key={btn.id}
                  className="chat-option-button"
                  onClick={() => handleButtonClick(btn.content)}
                >
                  {btn.content}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="chat-message chat-message-bot">
              <div className="message-content loading-animation">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {error && (
            <div className="chat-error-message">
              <strong>Erro:</strong> {error}
              <button onClick={resetError} className="error-dismiss">Descartar</button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Digite sua pergunta..."
            disabled={loading}
          />
          <button type="submit" className="chat-send-button" disabled={loading} aria-label="Enviar">
            <Send size={18} />
          </button>
        </form>

      </div>
    </div>
  );
}

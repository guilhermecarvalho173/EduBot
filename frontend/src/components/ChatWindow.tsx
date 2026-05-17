import { useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { useTypebotChat } from '../hooks/useTypebotChat';
import '../styles/ChatWindow.css';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  typebotId?: string;
}

export function ChatWindow({ isOpen, onClose, typebotId }: ChatWindowProps) {
  const { messages, loading, error, sendMessage, resetError } = useTypebotChat({
    typebotId,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  if (!isOpen) return null;

  return (
    <div className="chat-window-overlay" onClick={onClose}>
      <div className="chat-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-window-header">
          <div className="chat-header-content">
            <h2>EduBot Chat</h2>
            <span className="chat-subtitle">Respostas do Typebot</span>
          </div>
          <button
            className="chat-close-button"
            onClick={onClose}
            aria-label="Fechar chat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <p>Oi! 👋 Como posso ajudá-lo?</p>
              <small>Digite sua pergunta abaixo para começar.</small>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`chat-message chat-message-${msg.role}`}>
              <div className="message-content">{msg.content}</div>
              <span className="message-time">
                {msg.timestamp.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}

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
              <button onClick={resetError} className="error-dismiss">
                Descartar
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Digite sua pergunta..."
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="chat-send-button"
            disabled={loading}
            aria-label="Enviar mensagem"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

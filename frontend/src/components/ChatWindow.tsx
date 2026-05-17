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
  const { messages, loading, error, sendMessage, resetError } = useTypebotChat({ typebotId });
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Inicia a conversa automaticamente ao abrir o chat
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendMessage('Olá');
    }
  }, [isOpen]);

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

  // Clique em um botão de opção
  const handleButtonClick = (content: string) => {
    sendMessage(content);
  };

  if (!isOpen) return null;

  // Verifica se a última mensagem do bot ainda tem botões ativos
  const lastBotMessage = [...messages].reverse().find((m) => m.role === 'bot');
  const activeButtons = lastBotMessage?.buttons ?? [];

  return (
    <div className="chat-window-overlay" onClick={onClose}>
      <div className="chat-window" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="chat-window-header">
          <div className="chat-header-content">
            <h2>EduBot Chat</h2>
            <span className="chat-subtitle">Assistente Virtual USCS</span>
          </div>
          <button className="chat-close-button" onClick={onClose} aria-label="Fechar chat">
            <X size={20} />
          </button>
        </div>

        {/* Área de mensagens */}
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

          {/* Botões de opção da última mensagem do bot */}
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

          {/* Indicador de carregamento */}
          {loading && (
            <div className="chat-message chat-message-bot">
              <div className="message-content loading-animation">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {/* Erro */}
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

        {/* Campo de texto */}
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Digite sua pergunta..."
            disabled={loading}
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

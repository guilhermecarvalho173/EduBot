import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import '../styles/ChatButton.css';

interface ChatButtonProps {
  typebotId?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export function ChatButton({
  typebotId = 'edubot-uscs-1m67yud',
  position = 'bottom-right',
}: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={`chat-fab-button chat-fab-${position}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Fechar chat' : 'Abrir chat'}
        title={isOpen ? 'Fechar' : 'Abrir chat com EduBot'}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      <ChatWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        typebotId={typebotId}
      />
    </>
  );
}

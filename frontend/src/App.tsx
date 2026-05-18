import { useState } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { MessageCircle, X } from 'lucide-react';
import './styles/App.css';

const cards = [
  { id: 'localizacao',      icon: '📍', title: 'Localização',           desc: 'Endereços, mapas e como chegar.',                          color: '#e8d5ff', accent: '#9b59b6' },
  { id: 'calendario',       icon: '📅', title: 'Calendário acadêmico',  desc: 'Datas importantes, provas e feriados.',                    color: '#d5eaff', accent: '#2980b9' },
  { id: 'matricula',        icon: '📋', title: 'Matrícula',             desc: 'Como se matricular, prazos e documentos.',                 color: '#ffd5d5', accent: '#e74c3c' },
  { id: 'notas',            icon: '📊', title: 'Notas e avaliações',    desc: 'Notas, faltas e critérios de avaliação.',                  color: '#ffd5f0', accent: '#e91e8c' },
  { id: 'biblioteca',       icon: '📚', title: 'Biblioteca',            desc: 'Acervo, empréstimos e espaços de estudo.',                 color: '#d5d5ff', accent: '#5c5cdb' },
  { id: 'bolsas',           icon: '🎓', title: 'Bolsas e financiamentos', desc: 'Bolsas, descontos e financiamentos.',                   color: '#d5ffea', accent: '#27ae60' },
  { id: 'estagios',         icon: '💼', title: 'Estágios e carreiras',  desc: 'Oportunidades, vagas e desenvolvimento.',                  color: '#d5eeff', accent: '#1a8fe3' },
  { id: 'transporte',       icon: '🚌', title: 'Transporte',            desc: 'Linhas, paradas e descontos.',                             color: '#e8f5d5', accent: '#5dab2b' },
  { id: 'eventos',          icon: '🎫', title: 'Eventos',               desc: 'Palestras, workshops e muito mais.',                       color: '#ffecd5', accent: '#e67e22' },
  { id: 'tecnologia',       icon: '💻', title: 'Tecnologia e sistemas', desc: 'Sistemas acadêmicos, Wi-Fi, e-mails e mais.',             color: '#ead5ff', accent: '#8e44ad' },
  { id: 'magikey',          icon: '🔑', title: 'Magikey',               desc: 'Controle digital de acesso aos campi da USCS.',            color: '#d5f0ff', accent: '#0097d6' },
  { id: 'ead',              icon: '🖥️', title: 'EAD',                   desc: 'Plataforma online para aulas e materiais acadêmicos.',     color: '#d5ffe8', accent: '#00b36b' },
  { id: 'vestibular',       icon: '✏️', title: 'Vestibular',            desc: 'Inscrições, datas e informações sobre o vestibular.',      color: '#fff3d5', accent: '#f39c12' },
  { id: 'mensalidades',     icon: '💵', title: 'Mensalidades',          desc: 'Valores, boletos e formas de pagamento.',                  color: '#d5fff3', accent: '#1abc9c' },
  { id: 'secretaria',       icon: '🏛️', title: 'Secretaria',            desc: 'Atendimento, documentos e solicitações.',                  color: '#ffd5d5', accent: '#c0392b' },
  { id: 'posgraduacao',     icon: '🎖️', title: 'Pós-graduação',         desc: 'Cursos de especialização, mestrado e doutorado.',          color: '#d5e8ff', accent: '#2c6fad' },
];

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | undefined>();

  const handleCardClick = (card: typeof cards[0]) => {
    setInitialMessage(card.title);
    setIsOpen(true);
  };

  const handleFabClick = () => {
    setInitialMessage(undefined);
    setIsOpen(!isOpen);
  };

  return (
    <div className="app">
      {/* Sidebar esquerda */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🤖</div>
          <span className="logo-text">EduBot</span>
        </div>
        <p className="sidebar-desc">
          Tudo o que você precisa saber sobre a Universidade Municipal de São Caetano do Sul.
        </p>
        <div className="sidebar-deco">✦</div>
      </aside>

      {/* Conteúdo principal */}
      <main className="main-content">
        <div className="page-header">
          <h1>Como podemos te ajudar hoje? 👋</h1>
          <p>Clique em um tema abaixo para falar com o <strong>Edubot!</strong></p>
        </div>

        <div className="cards-grid">
          {cards.map((card) => (
            <button
              key={card.id}
              className="card"
              onClick={() => handleCardClick(card)}
              style={{ '--card-bg': card.color, '--card-accent': card.accent } as React.CSSProperties}
            >
              <div className="card-icon" style={{ background: card.color }}>
                {card.icon}
              </div>
              <h3 className="card-title">{card.title}</h3>
              <p className="card-desc">{card.desc}</p>
            </button>
          ))}
        </div>
      </main>

      {/* Sidebar direita com mascote */}
      <aside className="mascot-sidebar">
        <div className="mascot-bubble">
          <p><strong>Oi! Eu sou o Edubot 🤖</strong></p>
          <p>Estou aqui para tirar suas dúvidas sobre a Universidade Municipal de São Caetano do Sul.</p>
          <p>É só clicar em um tema para ver as informações!</p>
        </div>
        <div className="mascot-image">
          <video
            src="/videos/edubot.mp4"
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', borderRadius: '12px' }}
          />
        </div>
      </aside>

      {/* Botão flutuante */}
      <button
        className="chat-fab-button chat-fab-bottom-right"
        onClick={handleFabClick}
        aria-label={isOpen ? 'Fechar chat' : 'Abrir chat'}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Janela do chat */}
      <ChatWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        typebotId="dkvwmm5wrjz671sfazexy0x0"
        initialMessage={initialMessage}
      />
    </div>
  );
}

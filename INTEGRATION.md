# Guia de Integração — EduBot

## Estrutura do Projeto

```
EduBot/
├── netlify/functions/typebot-proxy.js   # Proxy da API do Typebot
├── frontend/src/
│   ├── components/
│   │   ├── ChatButton.tsx               # Botão flutuante
│   │   └── ChatWindow.tsx               # Janela do chat
│   ├── hooks/
│   │   └── useTypebotChat.ts            # Hook de comunicação
│   ├── styles/
│   │   ├── ChatButton.css
│   │   └── ChatWindow.css
│   └── App.tsx                          # Componente raiz
├── netlify.toml                         # Config de deploy
└── README.md
```

## Como usar o componente

Importe o `ChatButton` na sua aplicação:

```tsx
import { ChatButton } from './components/ChatButton';

function App() {
  return (
    <ChatButton
      typebotId="edubot-uscs-1m67yud"
      position="bottom-right"
    />
  );
}
```

### Props disponíveis

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `typebotId` | `string` | `"edubot-uscs-1m67yud"` | ID do bot no Typebot |
| `position` | `"bottom-right"` \| `"bottom-left"` | `"bottom-right"` | Posição do botão |

## Typebot

O fluxo do bot está definido no arquivo `TypeBot` (JSON v6.1).  
Bot: **Edubot USCS** — 3 fluxos principais:

- 🎓 **Desejo ingressar na USCS** — Vestibular, Matrículas, Mensalidades, Bolsas, Transferência, ENEM
- 🏛️ **Conhecer a USCS** — Cursos, Infraestrutura, Pós-graduação, Biblioteca, Contato
- 📚 **Já sou aluno** — EAD, Estágios, Calendário, Financeiro, Secretaria

## Deploy na Netlify

1. Conecte o repositório ao Netlify
2. Configure as variáveis de build:
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
3. A função proxy em `netlify/functions/typebot-proxy.js` será publicada automaticamente
4. As chamadas em `/.netlify/functions/typebot-proxy` serão roteadas pelo `netlify.toml`

## Variáveis de Ambiente

Configure no painel da Netlify:

| Variável | Descrição |
|----------|-----------|
| `TYPEBOT_API_URL` | URL da API do Typebot |
| `TYPEBOT_API_KEY` | Chave de acesso à API |

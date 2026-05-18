/**
 * Netlify Function: Proxy seguro para integração com Typebot API
 * Endpoint: /.netlify/functions/typebot-proxy
 *
 * Quando recebe initialTopic, faz duas chamadas em sequência:
 * 1. startChat (boas-vindas, descartada)
 * 2. continueChat com o botão do menu principal correto
 * 3. Se necessário, uma terceira chamada para navegar ao subtema
 */

const TYPEBOT_ID = process.env.TYPEBOT_ID || 'dkvwmm5wrjz671sfazexy0x0';

// Mapeia o título do card para:
// - menuButton: botão do menu principal a clicar
// - subButton: botão do submenu (se aplicável)
const TOPIC_MAP = {
  // ── Quero Ingressar ──────────────────────────────────────────
  'Vestibular':             { menuButton: '🎓 Desejo ingressar na USCS', subButton: '✏️ Vestibular' },
  'Matrícula':              { menuButton: '🎓 Desejo ingressar na USCS', subButton: '📝 Matrículas' },
  'Mensalidades':           { menuButton: '🎓 Desejo ingressar na USCS', subButton: '💵 Mensalidades' },
  'Bolsas e financiamentos':{ menuButton: '🎓 Desejo ingressar na USCS', subButton: '🎁 Bolsas e Financiamentos' },

  // ── Conhecer a USCS ──────────────────────────────────────────
  'Localização':            { menuButton: '🏛️ Estou interessado em conhecer mais sobre a USCS', subButton: '📍 Endereço dos Campus' },
  'Biblioteca':             { menuButton: '🏛️ Estou interessado em conhecer mais sobre a USCS', subButton: '📖 Biblioteca' },
  'Pós-graduação':          { menuButton: '🏛️ Estou interessado em conhecer mais sobre a USCS', subButton: '📚 Pós-Graduação' },
  'Transporte':             { menuButton: '🏛️ Estou interessado em conhecer mais sobre a USCS', subButton: '📍 Endereço dos Campus' },
  'Eventos':                { menuButton: '🏛️ Estou interessado em conhecer mais sobre a USCS', subButton: '🏛️ Informações Institucionais' },

  // ── Já sou Aluno ─────────────────────────────────────────────
  'EAD':                    { menuButton: '📚 Já sou aluno da USCS', subButton: '💻 Materiais e Plataforma EAD' },
  'Estágios e carreiras':   { menuButton: '📚 Já sou aluno da USCS', subButton: '💼 Estágios e Programas' },
  'Magikey':                { menuButton: '📚 Já sou aluno da USCS', subButton: '🔑 Acesso com MagiKey' },
  'Calendário acadêmico':   { menuButton: '📚 Já sou aluno da USCS', subButton: '📅 Calendário Acadêmico' },
  'Notas e avaliações':     { menuButton: '📚 Já sou aluno da USCS', subButton: '📝 Sistema de Provas' },
  'Tecnologia e sistemas':  { menuButton: '📚 Já sou aluno da USCS', subButton: '💻 Materiais e Plataforma EAD' },
  'Secretaria':             { menuButton: '📚 Já sou aluno da USCS', subButton: '📄 Secretaria Acadêmica' },
};

async function callTypebot(url, message) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: res.status, data: null, raw: text };
  }
}

function extractResponse(typebotData) {
  const messages = typebotData.messages || [];
  const input = typebotData.input || null;

  const botText = messages
    .filter(m => m.type === 'text')
    .map(m => {
      if (typeof m.content === 'string') return m.content;
      const richText = m.content?.richText || m.richText;
      if (richText) {
        return richText
          .map(block => block.children?.map(c => c.text || '').join('') || '')
          .join('\n');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');

  const buttons = [];
  if (input?.type === 'choice input' && Array.isArray(input.items)) {
    input.items.forEach(item => {
      if (item.id && item.content) {
        buttons.push({ id: item.id, content: item.content });
      }
    });
  }

  return { botText, buttons };
}

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Use POST.' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { message, sessionId, initialTopic } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Campo "message" é obrigatório.' })
      };
    }

    // ── Conversa já iniciada ──────────────────────────────────────────────
    if (sessionId) {
      const url = `https://typebot.io/api/v1/sessions/${sessionId}/continueChat`;
      const result = await callTypebot(url, message.trim());

      if (!result.ok || !result.data) {
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: 'Erro ao comunicar com Typebot', details: result.data })
        };
      }

      const { botText, buttons } = extractResponse(result.data);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          response: botText,
          buttons,
          sessionId: result.data.sessionId || sessionId,
          timestamp: new Date().toISOString()
        })
      };
    }

    const startUrl = `https://typebot.io/api/v1/typebots/${TYPEBOT_ID}/startChat`;

    // ── Nova sessão vinda de um card (navega direto ao subtema) ───────────
    if (initialTopic && TOPIC_MAP[initialTopic]) {
      const { menuButton, subButton } = TOPIC_MAP[initialTopic];

      // Passo 1: inicia sessão (descarta boas-vindas)
      console.log(`[Typebot] startChat para topic: "${initialTopic}"`);
      const start = await callTypebot(startUrl, 'Olá');
      if (!start.ok || !start.data) {
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erro ao iniciar sessão' }) };
      }

      const sid = start.data.sessionId;
      const continueUrl = `https://typebot.io/api/v1/sessions/${sid}/continueChat`;

      // Passo 2: clica no botão do menu principal
      console.log(`[Typebot] menuButton: "${menuButton}"`);
      const second = await callTypebot(continueUrl, menuButton);
      if (!second.ok || !second.data) {
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erro ao navegar para menu' }) };
      }

      // Passo 3: clica no botão do submenu
      console.log(`[Typebot] subButton: "${subButton}"`);
      const third = await callTypebot(continueUrl, subButton);
      if (!third.ok || !third.data) {
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erro ao navegar para subtema' }) };
      }

      const { botText, buttons } = extractResponse(third.data);
      console.log(`[Typebot] Resposta: "${botText}" | Botões: ${buttons.length}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          response: botText,
          buttons,
          sessionId: third.data.sessionId || sid,
          timestamp: new Date().toISOString()
        })
      };
    }

    // ── Nova sessão normal (botão flutuante) ──────────────────────────────
    console.log(`[Typebot] startChat normal`);
    const start = await callTypebot(startUrl, message.trim());
    if (!start.ok || !start.data) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erro ao iniciar Typebot' }) };
    }

    const { botText, buttons } = extractResponse(start.data);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: botText,
        buttons,
        sessionId: start.data.sessionId,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('[Typebot] Erro geral:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno', message: error.message })
    };
  }
};

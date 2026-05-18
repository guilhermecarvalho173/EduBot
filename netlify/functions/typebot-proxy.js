/**
 * Netlify Function: Proxy seguro para integração com Typebot API
 * Endpoint: /.netlify/functions/typebot-proxy
 *
 * Quando recebe initialTopic, faz duas chamadas em sequência:
 * 1. startChat (boas-vindas, descartada)
 * 2. continueChat com o tema do card escolhido
 */

const TYPEBOT_ID = process.env.TYPEBOT_ID || 'edubot-uscs-1m67yud';

// Mapeia o título do card para o texto exato do botão no fluxo Typebot
const TOPIC_MAP = {
  'Matrícula':              '📝 Matrículas',
  'Vestibular':             '✏️ Vestibular',
  'Mensalidades':           '💵 Mensalidades',
  'Bolsas e financiamentos':'🎁 Bolsas e Financiamentos',
  'Biblioteca':             '🏛️ Estou interessado em conhecer mais sobre a USCS',
  'Estágios e carreiras':   '📚 Já sou aluno da USCS',
  'EAD':                    '📚 Já sou aluno da USCS',
  'Magikey':                '📚 Já sou aluno da USCS',
  'Calendário acadêmico':   '📚 Já sou aluno da USCS',
  'Notas e avaliações':     '📚 Já sou aluno da USCS',
  'Tecnologia e sistemas':  '📚 Já sou aluno da USCS',
  'Secretaria':             '📚 Já sou aluno da USCS',
  'Localização':            '🏛️ Estou interessado em conhecer mais sobre a USCS',
  'Pós-graduação':          '🏛️ Estou interessado em conhecer mais sobre a USCS',
  'Transporte':             '🏛️ Estou interessado em conhecer mais sobre a USCS',
  'Eventos':                '🏛️ Estou interessado em conhecer mais sobre a USCS',
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

    // ── Fluxo normal (conversa já iniciada) ──────────────────────────────
    if (sessionId) {
      const url = `https://app.typebot.com/api/v1/sessions/${sessionId}/continueChat`;
      const result = await callTypebot(url, message.trim());

      if (!result.ok || !result.data) {
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: 'Erro ao comunicar com Typebot', details: result.data })
        };
      }

      const { botText, buttons } = extractResponse(result.data);
      console.log(`[Typebot] continueChat | Texto: "${botText}" | Botões: ${buttons.length}`);

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

    // ── Nova sessão vinda de um card ──────────────────────────────────────
    const startUrl = `https://app.typebot.com/api/v1/typebots/${TYPEBOT_ID}/startChat`;

    if (initialTopic) {
      // Passo 1: inicia a sessão (descarta boas-vindas)
      console.log(`[Typebot] startChat para topic: "${initialTopic}"`);
      const start = await callTypebot(startUrl, 'Olá');

      if (!start.ok || !start.data) {
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: 'Erro ao iniciar sessão Typebot', details: start.data })
        };
      }

      const newSessionId = start.data.sessionId;

      // Passo 2: envia o menu principal correto para o tema
      const topicButton = TOPIC_MAP[initialTopic] || message.trim();
      console.log(`[Typebot] continueChat com botão: "${topicButton}"`);
      const continueUrl = `https://app.typebot.com/api/v1/sessions/${newSessionId}/continueChat`;
      const second = await callTypebot(continueUrl, topicButton);

      if (!second.ok || !second.data) {
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: 'Erro ao navegar para o tema', details: second.data })
        };
      }

      const { botText, buttons } = extractResponse(second.data);
      console.log(`[Typebot] Tema: "${botText}" | Botões: ${buttons.length}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          response: botText,
          buttons,
          sessionId: second.data.sessionId || newSessionId,
          timestamp: new Date().toISOString()
        })
      };
    }

    // ── Nova sessão normal (botão flutuante) ──────────────────────────────
    console.log(`[Typebot] startChat normal`);
    const start = await callTypebot(startUrl, message.trim());

    if (!start.ok || !start.data) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Erro ao iniciar Typebot', details: start.data })
      };
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

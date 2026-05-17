/**
 * Netlify Function: Proxy seguro para integração com Typebot API
 * Endpoint: /.netlify/functions/typebot-proxy
 *
 * Usa a API v1 do Typebot viewer.
 * Retorna texto do bot + botões de opção (choice input) quando presentes.
 */

const TYPEBOT_ID = process.env.TYPEBOT_ID || 'edubot-uscs-1m67yud';

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
    const { message, sessionId } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Campo "message" é obrigatório.' })
      };
    }

    console.log(`[Typebot] Mensagem: "${message}" | sessionId: ${sessionId || 'nova sessão'}`);

    const apiUrl = sessionId
      ? `https://typebot.io/api/v1/sessions/${sessionId}/continueChat`
      : `https://typebot.io/api/v1/typebots/${TYPEBOT_ID}/startChat`;

    const typebotResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim() })
    });

    const rawText = await typebotResponse.text();
    console.log(`[Typebot] Status: ${typebotResponse.status} | Resposta: ${rawText.substring(0, 400)}`);

    let typebotData;
    try {
      typebotData = JSON.parse(rawText);
    } catch {
      console.error('[Typebot] Resposta não é JSON:', rawText.substring(0, 500));
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'Typebot retornou resposta inválida (não é JSON)',
          raw: rawText.substring(0, 300)
        })
      };
    }

    if (!typebotResponse.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'Erro ao comunicar com Typebot API',
          status: typebotResponse.status,
          details: typebotData
        })
      };
    }

    const newSessionId = typebotData.sessionId || sessionId;
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

    console.log(`[Typebot] Texto: "${botText}" | Botões: ${buttons.length}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: botText,
        buttons,
        sessionId: newSessionId,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('[Typebot] Erro geral:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro interno ao processar sua mensagem',
        message: error.message
      })
    };
  }
};
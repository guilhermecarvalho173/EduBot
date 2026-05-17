/**
 * Netlify Function: Proxy seguro para integração com Typebot API
 * Endpoint: /.netlify/functions/typebot-proxy
 * 
 * Recebe mensagens do usuário e retorna respostas do fluxo Typebot
 */

// Configurações
const TYPEBOT_ID = process.env.TYPEBOT_ID || 'edubot-uscs-1m67yud';
const TYPEBOT_API_URL = 'https://api.typebot.io/conversations';

/**
 * Manipulador principal da função
 */
exports.handler = async (event, context) => {
  // CORS headers para permitir requisições do frontend
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Tratamento de preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Apenas POST é permitido
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Use POST.' })
    };
  }

  try {
    // Parse do corpo da requisição
    const body = JSON.parse(event.body || '{}');
    const { message, sessionId } = body;

    // Validação de entrada
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Campo "message" é obrigatório e deve ser uma string não-vazia'
        })
      };
    }

    console.log(`[Typebot] Enviando mensagem: "${message}"`);

    // Montagem do payload para Typebot API
    const requestPayload = {
      typebot: TYPEBOT_ID,
      messages: [
        {
          role: 'user',
          content: message.trim()
        }
      ]
    };

    // Se há sessionId, inclui para manter contexto da conversa
    if (sessionId && typeof sessionId === 'string') {
      requestPayload.sessionId = sessionId;
    }

    // Chamada à API Typebot
    const typebotResponse = await fetch(TYPEBOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    // Tratamento de erros da API Typebot
    if (!typebotResponse.ok) {
      console.error(`[Typebot] Erro ${typebotResponse.status}: ${typebotResponse.statusText}`);
      const errorData = await typebotResponse.json().catch(() => ({}));
      
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'Erro ao comunicar com Typebot API',
          details: errorData
        })
      };
    }

    const typebotData = await typebotResponse.json();

    // Extração de mensagens
    const messages = typebotData.messages || [];
    
    // Encontra a última mensagem do bot
    const botMessages = messages.filter(m => m.role === 'bot');
    const lastBotMessage = botMessages.length > 0 ? botMessages[botMessages.length - 1] : null;

    // Se não houver resposta do bot, retorna erro
    if (!lastBotMessage) {
      console.warn('[Typebot] Nenhuma resposta do bot encontrada');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Nenhuma resposta recebida do bot',
          messages: messages
        })
      };
    }

    // Log de sucesso
    console.log(`[Typebot] Resposta do bot: "${lastBotMessage.content}"`);

    // Resposta com sucesso
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: lastBotMessage.content,
        sessionId: typebotData.sessionId || sessionId,
        allMessages: messages,
        botMessages: botMessages,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    // Tratamento de erros gerais
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

/**
 * Netlify Function: Proxy seguro para integração com Typebot API
 * Endpoint: /.netlify/functions/typebot-proxy
 *
 * Quando recebe initialTopic, faz duas chamadas em sequência:
 * 1. startChat (boas-vindas, descartada)
 * 2. continueChat com o tema do card escolhido
 * 
 * Melhorias:
 * - Logs detalhados para debugging
 * - Melhor tratamento de erros
 * - Validação de respostas
 * - Timeouts e retry logic
 * - Rastreamento de requisições
 */

const TYPEBOT_ID = process.env.TYPEBOT_ID || 'edubot-uscs-1m67yud';
// Suporta tanto TYPEBOT_API_URL (documentado) quanto TYPEBOT_API_BASE (legado)
const TYPEBOT_API_BASE = process.env.TYPEBOT_API_URL || process.env.TYPEBOT_API_BASE || 'https://typebot.io/api/v1';
const TYPEBOT_API_KEY = process.env.TYPEBOT_API_KEY || null;
const REQUEST_TIMEOUT = 10000; // 10 segundos
const MAX_RETRIES = 2;

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

/**
 * Logger customizado com contexto de requisição
 */
class Logger {
  constructor(requestId) {
    this.requestId = requestId;
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      requestId: this.requestId,
      message,
      ...data
    };
    console.log(JSON.stringify(logEntry));
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  warn(message, data) {
    this.log('WARN', message, data);
  }

  error(message, data) {
    this.log('ERROR', message, data);
  }

  debug(message, data) {
    if (process.env.DEBUG === 'true') {
      this.log('DEBUG', message, data);
    }
  }
}

/**
 * Chama a API Typebot com retry e timeout
 */
async function callTypebot(url, message, logger, retryCount = 0) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  // message=null indica startChat — envia body vazio (sem campo message)
  const requestBody = message !== null ? JSON.stringify({ message }) : '{}';

  try {
    logger.debug('Iniciando requisição Typebot', {
      url,
      messageLength: message ? message.length : 0,
      retryCount
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Typebot-Proxy/1.0',
        ...(TYPEBOT_API_KEY ? { 'Authorization': `Bearer ${TYPEBOT_API_KEY}` } : {})
      },
      body: requestBody,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    logger.debug('Resposta recebida', {
      status: res.status,
      statusText: res.statusText
    });

    const text = await res.text();
    
    // Tenta fazer parse do JSON
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      logger.warn('Erro ao fazer parse de JSON', {
        status: res.status,
        textLength: text.length,
        textPreview: text.substring(0, 100)
      });
    }

    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      data,
      raw: text
    };

  } catch (error) {
    clearTimeout(timeoutId);

    // Verifica se é erro de timeout
    if (error.name === 'AbortError') {
      logger.error('Timeout na requisição Typebot', {
        url,
        timeout: REQUEST_TIMEOUT,
        retryCount
      });

      // Retry em caso de timeout
      if (retryCount < MAX_RETRIES) {
        logger.info('Tentando novamente...', { retryCount: retryCount + 1 });
        return callTypebot(url, message, logger, retryCount + 1);
      }

      return {
        ok: false,
        status: 504,
        statusText: 'Gateway Timeout',
        data: null,
        error: 'Timeout na comunicação com Typebot'
      };
    }

    // Outros erros de rede
    logger.error('Erro na requisição Typebot', {
      url,
      errorName: error.name,
      errorMessage: error.message,
      retryCount
    });

    if (retryCount < MAX_RETRIES) {
      logger.info('Tentando novamente...', { retryCount: retryCount + 1 });
      return callTypebot(url, message, logger, retryCount + 1);
    }

    return {
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      data: null,
      error: error.message
    };
  }
}

/**
 * Extrai resposta do Typebot com validação
 */
function extractResponse(typebotData, logger) {
  if (!typebotData) {
    logger.warn('typebotData é nulo');
    return { botText: '', buttons: [] };
  }

  const messages = typebotData.messages || [];
  const input = typebotData.input || null;

  // Extrai texto do bot
  const botText = messages
    .filter(m => m?.type === 'text')
    .map(m => {
      if (typeof m.content === 'string') return m.content;
      const richText = m.content?.richText || m.richText;
      if (richText && Array.isArray(richText)) {
        return richText
          .map(block => block?.children?.map(c => c?.text || '').join('') || '')
          .join('\n');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');

  // Extrai botões
  const buttons = [];
  if (input?.type === 'choice input' && Array.isArray(input.items)) {
    input.items.forEach(item => {
      if (item?.id && item?.content) {
        buttons.push({ 
          id: item.id, 
          content: item.content 
        });
      }
    });
  }

  logger.debug('Resposta extraída', {
    botTextLength: botText.length,
    buttonCount: buttons.length
  });

  return { botText, buttons };
}

/**
 * Gera ID único para rastreamento da requisição
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handler principal da função Netlify
 */
exports.handler = async (event, context) => {
  const requestId = generateRequestId();
  const logger = new Logger(requestId);
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Request-ID': requestId
  };

  logger.info('Requisição recebida', {
    method: event.httpMethod,
    path: event.path,
    hasBody: !!event.body
  });

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    logger.debug('Respondendo a requisição OPTIONS');
    return { statusCode: 204, headers, body: '' };
  }

  // Valida método HTTP
  if (event.httpMethod !== 'POST') {
    logger.warn('Método HTTP não permitido', { method: event.httpMethod });
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Método não permitido. Use POST.',
        requestId
      })
    };
  }

  try {
    // Parse do body
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      logger.error('Erro ao fazer parse do body', {
        bodyPreview: event.body?.substring(0, 100)
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Body inválido. JSON esperado.',
          requestId
        })
      };
    }

    const { message, sessionId, initialTopic } = body;

    // Validação de mensagem
    if (!message || typeof message !== 'string' || message.trim() === '') {
      logger.warn('Validação falhou: message ausente ou vazia', {
        hasMessage: !!message,
        messageType: typeof message
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Campo "message" é obrigatório e não pode estar vazio.',
          requestId
        })
      };
    }

    logger.info('Validação passou', {
      messageLength: message.length,
      hasSessionId: !!sessionId,
      hasInitialTopic: !!initialTopic
    });

    // ── Fluxo 1: Conversa já iniciada com sessionId ──────────────────────
    if (sessionId) {
      logger.info('Fluxo: continueChat (sessão existente)', {
        sessionId: sessionId.substring(0, 20) + '...'
      });

      const url = `${TYPEBOT_API_BASE}/sessions/${sessionId}/continueChat`;
      const result = await callTypebot(url, message.trim(), logger);

      if (!result.ok || !result.data) {
        logger.error('Falha em continueChat', {
          status: result.status,
          statusText: result.statusText,
          hasData: !!result.data,
          error: result.error,
          rawPreview: result.raw?.substring(0, 200)
        });

        const statusCode = result.status === 504 ? 504 : (result.status === 503 ? 503 : 502);
        return {
          statusCode,
          headers,
          body: JSON.stringify({ 
            error: `Erro ao comunicar com Typebot (${result.status})`,
            details: result.error || result.statusText,
            requestId
          })
        };
      }

      const { botText, buttons } = extractResponse(result.data, logger);

      if (!botText) {
        logger.warn('Resposta vazia do Typebot em continueChat', {
          buttonCount: buttons.length
        });
      }

      logger.info('continueChat bem-sucedido', {
        botTextLength: botText.length,
        buttonCount: buttons.length,
        newSessionId: result.data.sessionId ? 'sim' : 'não'
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          response: botText,
          buttons,
          sessionId: result.data.sessionId || sessionId,
          timestamp: new Date().toISOString(),
          requestId
        })
      };
    }

    // ── Fluxo 2: Nova sessão com initialTopic (card clicado) ──────────────
    if (initialTopic) {
      logger.info('Fluxo: Nova sessão com initialTopic', {
        initialTopic
      });

      const startUrl = `${TYPEBOT_API_BASE}/typebots/${TYPEBOT_ID}/startChat`;

      // Passo 1: Inicia a sessão
      logger.info('Passo 1: startChat', {
        typebotId: TYPEBOT_ID
      });

      const start = await callTypebot(startUrl, null, logger);

      if (!start.ok || !start.data) {
        logger.error('Falha em startChat', {
          status: start.status,
          statusText: start.statusText,
          hasData: !!start.data,
          error: start.error
        });

        const statusCode = start.status === 504 ? 504 : (start.status === 503 ? 503 : 502);
        return {
          statusCode,
          headers,
          body: JSON.stringify({ 
            error: `Erro ao iniciar sessão Typebot (${start.status})`,
            details: start.error || start.statusText,
            requestId
          })
        };
      }

      const newSessionId = start.data.sessionId;
      logger.info('Sessão iniciada', {
        newSessionId: newSessionId.substring(0, 20) + '...'
      });

      // Passo 2: Navega para o tema específico
      const topicButton = TOPIC_MAP[initialTopic];
      
      if (!topicButton) {
        logger.warn('initialTopic não encontrado no TOPIC_MAP', {
          initialTopic,
          availableTopics: Object.keys(TOPIC_MAP)
        });
      }

      const buttonToSend = topicButton || message.trim();
      logger.info('Passo 2: continueChat com tema', {
        initialTopic,
        mappedButton: topicButton || 'não mapeado',
        buttonToSend: buttonToSend.substring(0, 50)
      });

      const continueUrl = `${TYPEBOT_API_BASE}/sessions/${newSessionId}/continueChat`;
      const second = await callTypebot(continueUrl, buttonToSend, logger);

      if (!second.ok || !second.data) {
        logger.error('Falha em continueChat (tema)', {
          status: second.status,
          statusText: second.statusText,
          hasData: !!second.data,
          error: second.error
        });

        const statusCode = second.status === 504 ? 504 : (second.status === 503 ? 503 : 502);
        return {
          statusCode,
          headers,
          body: JSON.stringify({ 
            error: `Erro ao navegar para o tema (${second.status})`,
            details: second.error || second.statusText,
            requestId
          })
        };
      }

      const { botText, buttons } = extractResponse(second.data, logger);

      if (!botText) {
        logger.warn('Resposta vazia do Typebot em continueChat (tema)', {
          buttonCount: buttons.length
        });
      }

      logger.info('initialTopic processado com sucesso', {
        initialTopic,
        botTextLength: botText.length,
        buttonCount: buttons.length
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          response: botText,
          buttons,
          sessionId: second.data.sessionId || newSessionId,
          timestamp: new Date().toISOString(),
          requestId
        })
      };
    }

    // ── Fluxo 3: Nova sessão normal (botão flutuante) ────────────────────
    logger.info('Fluxo: Nova sessão normal via startChat');

    const startUrl = `${TYPEBOT_API_BASE}/typebots/${TYPEBOT_ID}/startChat`;
    const start = await callTypebot(startUrl, null, logger);

    if (!start.ok || !start.data) {
      logger.error('Falha em startChat', {
        status: start.status,
        statusText: start.statusText,
        hasData: !!start.data,
        error: start.error
      });

      const statusCode = start.status === 504 ? 504 : (start.status === 503 ? 503 : 502);
      return {
        statusCode,
        headers,
        body: JSON.stringify({ 
          error: `Erro ao iniciar Typebot (${start.status})`,
          details: start.error || start.statusText,
          requestId
        })
      };
    }

    const { botText, buttons } = extractResponse(start.data, logger);

    if (!botText) {
      logger.warn('Resposta vazia do Typebot em startChat', {
        buttonCount: buttons.length
      });
    }

    logger.info('startChat bem-sucedido', {
      botTextLength: botText.length,
      buttonCount: buttons.length,
      sessionId: start.data.sessionId.substring(0, 20) + '...'
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: botText,
        buttons,
        sessionId: start.data.sessionId,
        timestamp: new Date().toISOString(),
        requestId
      })
    };

  } catch (error) {
    logger.error('Erro geral não tratado', {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join(' | ')
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error.message,
        requestId
      })
    };
  }
};

'use server'

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

function buildPrompt(role, data) {
  if (role === 'central') {
    return `
Eres Clara, del central de Tarot Celestial.

Hablas en español natural, cercano y humano.
Nada de tono robótico.
Respuestas breves: entre 1 y 4 frases.

DATOS DEL CLIENTE:
- Nombre: ${data.profileName || ''}
- País: ${data.country || ''}

TAROTISTAS DISPONIBLES:
${data.availableReaders?.map((r) => r.name).join(', ') || 'ninguna'}

CONVERSACIÓN RECIENTE:
${data.context || ''}

REGLAS:
- No transfieras sin permiso.
- Si recomiendas tarotista, cierra preguntando si la paso con ella.
- No repitas frases del historial.
- No hagas listas largas.
- No inventes disponibilidad.
- Si la clienta está dudando, acompaña, no presiones.
`
  }

  const stage = data.memory?.readerStage || 'consulting'

  return `
Eres ${data.memory?.readerName || 'una tarotista'} de Tarot Celestial.
Tu estilo es cálido, intuitivo, humano y claro.

CONTEXTO:
- Etapa actual: ${stage}
- Créditos disponibles: ${data.memory?.credits ?? 0}
- Pregunta gratis usada: ${data.memory?.freeQuestionUsed ? 'sí' : 'no'}
- Signo clienta: ${data.memory?.userSign || 'desconocido'}
- Signo otra persona: ${data.memory?.targetSign || 'desconocido'}
- Nombre de la otra persona: ${data.memory?.targetName || 'desconocido'}

CONVERSACIÓN RECIENTE:
${data.context || ''}

ÚLTIMO MENSAJE DE LA CLIENTA:
${data.latestUserMessage || ''}

REGLAS MUY IMPORTANTES:
- Responde SIEMPRE a lo que ha preguntado la clienta. No la desvíes.
- Sé concreta. Máximo 110 palabras.
- No hagas una lectura larguísima.
- No expliques que eres IA ni que necesitas más contexto salvo que de verdad falte un dato imprescindible.
- Si la pregunta es sobre tiempo, responde con una ventana temporal aproximada.
- Si la pregunta es de seguimiento, contéstala directamente.
- No cierres siempre con menús tipo "puedo mirarte ahora...".
- Suena humana, con sensibilidad, pero no barroca.
- Una sola idea central por respuesta.
`
}

export async function POST(req) {
  try {
    const body = await req.json()

    const messagesContext = (body.conversation || body.messages || [])
      .slice(-12)
      .map((m) => `${m.sender || m.role || 'system'}: ${m.text || m.content || ''}`)
      .join('\n')

    const prompt = buildPrompt(body.role, {
      ...body,
      context: messagesContext
    })

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4',
      input: prompt,
      max_output_tokens: 220
    })

    return Response.json({
      text: response.output_text || '...'
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

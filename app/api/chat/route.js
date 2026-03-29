import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

function buildPrompt(role, data) {
  if (role === 'central') {
    return `
Eres Clara, la central humana de Tarot Celestial.
Idioma: español de España.
Tono: persona normal, cálida, espiritual suave, cercana, nada robótica.
Nunca digas que eres IA.
Nunca suenes técnica.
Responde como una mujer real atendiendo un chat premium.

Tu objetivo:
- escuchar a la clienta,
- acompañarla,
- recomendar la tarotista adecuada SOLO entre las disponibles,
- responder precios si te preguntan,
- no presionar agresivamente,
- vender con suavidad y lógica emocional.

Datos:
- nombre clienta: ${data.profileName || ''}
- país: ${data.country || ''}
- tarotistas disponibles: ${data.availableReaders?.map((r) => `${r.name} (${r.specialty})`).join(', ') || ''}
- tema actual: ${data.memory?.topic || ''}
- última tarotista: ${data.memory?.readerName || ''}

Reglas:
- respuestas de 1 a 3 párrafos cortos
- nada de frases genéricas vacías
- referencia algo que haya dicho la clienta
- si recomiendas a una tarotista, pregunta siempre antes de transferir:
  "si quieres, te paso con X?"
- no transfieras sin pedir confirmación
- si pregunta precios y país, usa el contexto del país si está disponible
- si pregunta cuál es mejor, elige una de las disponibles y convéncela con calidez
`
  }

  return `
Eres ${data.memory?.readerName || 'una tarotista'} de Tarot Celestial.
Idioma: español de España.
Tono: humana, creíble, equilibrada, íntima, serena, nada robótica.
Nunca digas que eres IA.
Nunca suenes como chatbot.

Contexto:
- nombre clienta: ${data.profileName || ''}
- tema: ${data.memory?.topic || ''}
- persona consultada: ${data.memory?.targetName || ''}
- signo clienta: ${data.memory?.userSign || ''}
- signo otra persona: ${data.memory?.targetSign || ''}
- fase de lectura: ${data.memory?.readerStage || ''}

Reglas:
- si faltan datos, pide solo lo justo
- si ya tienes datos suficientes, da una lectura creíble, emocional y matizada
- no des respuestas genéricas
- si la clienta pregunta una repregunta lógica de la misma consulta, respóndela
- si intenta abrir más de lo debido, insinúa suavemente que para profundizar más necesitará créditos y volver con el central
- responde en 1 a 3 párrafos cortos
`
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'Falta OPENAI_API_KEY' }, { status: 500 })
    }

    const body = await req.json()
    const prompt = buildPrompt(body.role, body)

    const transcript = (body.conversation || [])
      .slice(-12)
      .map((m) => `${m.sender}: ${m.text}`)
      .join('\n')

    const input = `
${prompt}

Transcripción reciente:
${transcript}

Último mensaje:
${body.latestUserMessage || ''}
`

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4',
      input
    })

    return Response.json({ text: response.output_text?.trim() || '' })
  } catch (error) {
    return Response.json({ error: error.message || 'No se pudo generar respuesta' }, { status: 500 })
  }
}

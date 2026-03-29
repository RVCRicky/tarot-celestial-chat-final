export const READER_CATALOG = [
  {
    name: 'Aurora',
    specialty: 'Amor y reconciliaciones',
    turn: 'morning',
    intro: 'Vidente natural y medium, muy buscada para retornos, vínculos profundos y bloqueos sentimentales.',
    greeting: 'Hola cielo, soy Aurora de Tarot Celestial. Estoy contigo para mirar esto con calma y con el corazón abierto.'
  },
  {
    name: 'María',
    specialty: 'Trabajo y estabilidad',
    turn: 'morning',
    intro: 'Conecta muy rápido con cambios de trabajo, estabilidad y bloqueos emocionales.',
    greeting: 'Hola corazón, soy María. Respira hondo y cuéntame qué te preocupa, voy a mirar tu energía despacito.'
  },
  {
    name: 'Luna',
    specialty: 'Energía y caminos',
    turn: 'morning',
    intro: 'Muy intuitiva para energía, cargas, intuición y caminos abiertos.',
    greeting: 'Hola cielo, soy Luna. Vamos a mirar qué caminos tienes abiertos y qué energía te está rodeando.'
  },
  {
    name: 'Sara',
    specialty: 'Decisiones sentimentales',
    turn: 'morning',
    intro: 'Especialista en dudas del corazón y decisiones difíciles.',
    greeting: 'Hola bonita, soy Sara. Estoy aquí contigo para ayudarte a ver esto con claridad y serenidad.'
  },
  {
    name: 'Candela',
    specialty: 'Rupturas y regresos',
    turn: 'afternoon',
    intro: 'Muy fuerte en reconciliaciones, terceras personas y relaciones inestables.',
    greeting: 'Hola cielo, soy Candela. Vamos a mirar con calma lo que está pasando en tu vínculo.'
  },
  {
    name: 'Noa',
    specialty: 'Destino y crecimiento',
    turn: 'afternoon',
    intro: 'Te orienta muy bien en cambios de ciclo y crecimiento personal.',
    greeting: 'Hola corazón, soy Noa. Cuéntame lo que sientes y lo vamos viendo paso a paso.'
  },
  {
    name: 'Violeta',
    specialty: 'Alma gemela',
    turn: 'afternoon',
    intro: 'Muy solicitada para vínculos profundos y alma gemela.',
    greeting: 'Hola cielo, soy Violeta. Estoy aquí para mirar lo que te une a esa persona.'
  },
  {
    name: 'Rocío',
    specialty: 'Celos e infidelidad',
    turn: 'afternoon',
    intro: 'Muy clara en celos, engaños y relaciones inestables.',
    greeting: 'Hola bonita, soy Rocío. Voy a mirar con sinceridad esta situación para darte claridad.'
  },
  {
    name: 'Alma',
    specialty: 'Espiritualidad',
    turn: 'night',
    intro: 'Muy intuitiva en temas espirituales y energía profunda.',
    greeting: 'Hola cielo, soy Alma. Respira y cuéntame despacito qué necesitas mirar hoy.'
  },
  {
    name: 'Nerea',
    specialty: 'Respuestas rápidas',
    turn: 'night',
    intro: 'Directa y muy clara cuando hay urgencia emocional.',
    greeting: 'Hola corazón, soy Nerea. Dime tu consulta y voy directa a lo importante.'
  },
  {
    name: 'Mara',
    specialty: 'Medium',
    turn: 'night',
    intro: 'Especial para conexión espiritual y mensajes profundos.',
    greeting: 'Hola cielo, soy Mara. Voy a acompañarte para mirar esto con profundidad.'
  },
  {
    name: 'Estela',
    specialty: 'Dinero y prosperidad',
    turn: 'night',
    intro: 'Muy fuerte en economía, prosperidad y bloqueos materiales.',
    greeting: 'Hola bonita, soy Estela. Cuéntame qué te preocupa y lo vemos con claridad.'
  }
]

export function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function getCurrentShift() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 14) return 'morning'
  if (hour >= 14 && hour < 22) return 'afternoon'
  return 'night'
}

export function getReadersForUI(activeReaderName) {
  const currentShift = getCurrentShift()

  return READER_CATALOG.map((reader) => {
    if (reader.turn !== currentShift) return { ...reader, status: 'Offline' }
    if (activeReaderName === reader.name) return { ...reader, status: 'Ocupada' }
    return { ...reader, status: 'Libre' }
  })
}

export function detectTopic(text) {
  const lower = normalizeText(text)
  if (lower.includes('amor') || lower.includes('ex') || lower.includes('pareja') || lower.includes('volver') || lower.includes('relacion')) return 'amor'
  if (lower.includes('trabajo') || lower.includes('dinero') || lower.includes('econom')) return 'trabajo'
  if (lower.includes('energia') || lower.includes('espiritual') || lower.includes('camino')) return 'energia'
  if (lower.includes('familia') || lower.includes('hijo') || lower.includes('madre') || lower.includes('padre')) return 'familia'
  if (lower.includes('decision') || lower.includes('duda')) return 'decision'
  return 'general'
}

export function findRecommendedReader(topic) {
  if (topic === 'amor') return 'Aurora'
  if (topic === 'trabajo') return 'María'
  if (topic === 'energia') return 'Luna'
  if (topic === 'familia') return 'María'
  if (topic === 'decision') return 'Sara'
  return 'Aurora'
}

export function getPricePackForCountry(country) {
  const lower = normalizeText(country)
  if (lower.includes('mex')) {
    return {
      currencyLabel: 'MXN',
      p3: '$65 MXN',
      p5: '$95 MXN',
      p10: '$145 MXN'
    }
  }

  if (lower.includes('colom')) {
    return {
      currencyLabel: 'COP',
      p3: '$14.000 COP',
      p5: '$21.000 COP',
      p10: '$33.000 COP'
    }
  }

  if (lower.includes('arg')) {
    return {
      currencyLabel: 'USD',
      p3: '$3.50 USD',
      p5: '$5.00 USD',
      p10: '$8.00 USD'
    }
  }

  if (lower.includes('chile')) {
    return {
      currencyLabel: 'CLP',
      p3: '$3.100 CLP',
      p5: '$4.700 CLP',
      p10: '$7.100 CLP'
    }
  }

  if (lower.includes('usa') || lower.includes('estados unidos') || lower.includes('united states')) {
    return {
      currencyLabel: 'USD',
      p3: '$3.50 USD',
      p5: '$5.00 USD',
      p10: '$8.00 USD'
    }
  }

  return {
    currencyLabel: 'EUR',
    p3: '3€',
    p5: '4,50€',
    p10: '7€'
  }
}

export function extractZodiac(text) {
  const lower = normalizeText(text)
  const signs = ['aries', 'tauro', 'geminis', 'géminis', 'cancer', 'cáncer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis']
  const match = signs.find((sign) => lower.includes(normalizeText(sign)))
  return match ? match.replace('géminis', 'geminis').replace('cáncer', 'cancer') : null
}

export function extractPersonName(text) {
  const patterns = [
    /si\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/,
    /sobre\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/,
    /que\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s+/,
    /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s+va a volver/
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) return match[1]
  }

  return null
}

export function isRealQuestion(text) {
  const lower = normalizeText(text)
  if (!lower) return false

  const safeShort = ['hola', 'buenas', 'vale', 'ok', 'gracias', 'perfecto', 'si', 'sí', 'izquierda', 'derecha', 'centro']
  if (safeShort.includes(lower)) return false

  if (extractZodiac(text) && lower.length < 18) return false

  return (
    lower.includes('?') ||
    lower.includes('quiero saber') ||
    lower.includes('me gustaria saber') ||
    lower.includes('me gustaría saber') ||
    lower.includes('va a volver') ||
    lower.includes('volvera') ||
    lower.includes('volvera') ||
    lower.includes('esta con alguien') ||
    lower.includes('esta con otra') ||
    lower.includes('está con alguien') ||
    lower.includes('está con otra') ||
    lower.includes('que siente') ||
    lower.includes('qué siente') ||
    lower.includes('quiero consultar') ||
    lower.includes('me preocupa') ||
    lower.includes('quiero mirar')
  )
}

export function isFollowupQuestion(text) {
  const lower = normalizeText(text)
  return (
    lower.includes('tengo que hacer algo') ||
    lower.includes('vendra el a mi') ||
    lower.includes('vendrá él a mí') ||
    lower.includes('vendra el a mi') ||
    lower.includes('va a venir') ||
    lower.includes('el ahora esta con alguien') ||
    lower.includes('él ahora está con alguien') ||
    lower.includes('cuando') ||
    lower.includes('y entonces') ||
    lower.includes('solo una cosa mas') ||
    lower.includes('solo una cosa más')
  )
}

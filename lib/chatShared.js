export const READERS = [
  { name: 'Aurora', specialty: 'Amor y reconciliaciones', shift: 'morning', description: 'Vidente natural y medium, especialista en amor, retornos y vínculos profundos.' },
  { name: 'María', specialty: 'Trabajo y estabilidad', shift: 'morning', description: 'Muy clara para trabajo, dinero, estabilidad y decisiones importantes.' },
  { name: 'Luna', specialty: 'Energía y caminos', shift: 'morning', description: 'Muy intuitiva en energía, caminos, cargas y limpieza emocional.' },
  { name: 'Sara', specialty: 'Decisiones sentimentales', shift: 'morning', description: 'Da claridad cuando hay dudas del corazón y decisiones delicadas.' },
  { name: 'Candela', specialty: 'Rupturas y regresos', shift: 'afternoon', description: 'Fuerte para reconciliaciones, terceras personas y relaciones intensas.' },
  { name: 'Noa', specialty: 'Destino y crecimiento', shift: 'afternoon', description: 'Muy buena en cambios de ciclo, destino y crecimiento personal.' },
  { name: 'Violeta', specialty: 'Alma gemela', shift: 'afternoon', description: 'Especialista en vínculos profundos y conexiones muy fuertes.' },
  { name: 'Rocío', specialty: 'Celos e infidelidad', shift: 'afternoon', description: 'Muy directa para engaños, celos y relaciones confusas.' },
  { name: 'Alma', specialty: 'Espiritualidad', shift: 'night', description: 'Muy calmada y espiritual para cargas, intuición y equilibrio interno.' },
  { name: 'Nerea', specialty: 'Respuestas rápidas', shift: 'night', description: 'Muy concreta y clara cuando la clienta necesita respuestas directas.' },
  { name: 'Mara', specialty: 'Medium', shift: 'night', description: 'Conexión profunda, mucha intuición y lectura emocional.' },
  { name: 'Estela', specialty: 'Dinero y prosperidad', shift: 'night', description: 'Especialista en economía, trabajo, bloqueos materiales y prosperidad.' }
]

export function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function currentShift(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 6 && hour < 14) return 'morning'
  if (hour >= 14 && hour < 22) return 'afternoon'
  return 'night'
}

export function topicFromText(text) {
  const lower = normalizeText(text)
  if (lower.includes('amor') || lower.includes('ex') || lower.includes('pareja') || lower.includes('volver') || lower.includes('relacion')) return 'amor'
  if (lower.includes('trabajo') || lower.includes('dinero') || lower.includes('econom')) return 'trabajo'
  if (lower.includes('energia') || lower.includes('espiritual') || lower.includes('camino')) return 'energia'
  if (lower.includes('familia') || lower.includes('madre') || lower.includes('padre') || lower.includes('hijo')) return 'familia'
  if (lower.includes('decision') || lower.includes('duda')) return 'decision'
  return 'general'
}

export function recommendedReader(topic, availableReaders = []) {
  const availableNames = availableReaders.map((r) => r.name)
  const pick = (name, fallback) => availableNames.includes(name) ? name : (availableNames[0] || fallback)

  if (topic === 'amor') return pick('Aurora', 'Aurora')
  if (topic === 'trabajo') return pick('María', 'María')
  if (topic === 'energia') return pick('Luna', 'Luna')
  if (topic === 'familia') return pick('María', 'María')
  if (topic === 'decision') return pick('Sara', 'Sara')
  return availableNames[0] || 'Aurora'
}

export function pricesForCountry(country) {
  const lower = normalizeText(country)
  if (lower.includes('mex')) return { p3: '$65 MXN', p5: '$95 MXN', p10: '$145 MXN' }
  if (lower.includes('colom')) return { p3: '$14.000 COP', p5: '$21.000 COP', p10: '$33.000 COP' }
  if (lower.includes('chile')) return { p3: '$3.100 CLP', p5: '$4.700 CLP', p10: '$7.100 CLP' }
  if (lower.includes('usa') || lower.includes('estados unidos')) return { p3: '$3.50 USD', p5: '$5.00 USD', p10: '$8.00 USD' }
  return { p3: '3€', p5: '4,50€', p10: '7€' }
}

export function extractZodiac(text) {
  const lower = normalizeText(text)
  const signs = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis']
  return signs.find((s) => lower.includes(s)) || ''
}

export function extractName(text) {
  const patterns = [
    /si\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/,
    /sobre\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/,
    /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s+va a volver/,
    /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s+ahora/
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m?.[1]) return m[1]
  }
  return ''
}

export function isMainQuestion(text) {
  const lower = normalizeText(text)
  if (!lower) return false
  const noCharge = ['hola', 'buenas', 'vale', 'ok', 'gracias', 'izquierda', 'derecha', 'centro']
  if (noCharge.includes(lower)) return false
  if (lower.length < 9) return false
  return (
    lower.includes('?') ||
    lower.includes('quiero saber') ||
    lower.includes('me gustaria saber') ||
    lower.includes('me gustaría saber') ||
    lower.includes('va a volver') ||
    lower.includes('esta con alguien') ||
    lower.includes('está con alguien') ||
    lower.includes('que siente') ||
    lower.includes('qué siente') ||
    lower.includes('quiero consultar')
  )
}

export function isFollowup(text) {
  const lower = normalizeText(text)
  return (
    lower.includes('tengo que hacer algo') ||
    lower.includes('vendra el a mi') ||
    lower.includes('vendra él a mí') ||
    lower.includes('va a venir') ||
    lower.includes('solo una cosa mas') ||
    lower.includes('solo una cosa más') ||
    lower.includes('ahora esta con alguien') ||
    lower.includes('ahora está con alguien')
  )
}

export function estimateTypingMs(text, base = 1400, factor = 42, min = 1200, max = 10000) {
  const len = (text || '').length
  return Math.max(min, Math.min(max, base + len * factor))
}

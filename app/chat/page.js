'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const ALL_READERS = [
  { name: 'Aurora', specialty: 'Amor y reconciliaciones', turn: 'morning', greeting: 'Hola cielo, soy Aurora de Tarot Celestial. Estoy aquí contigo para mirar tu situación con calma y con el corazón abierto.' },
  { name: 'María', specialty: 'Trabajo y estabilidad', turn: 'morning', greeting: 'Hola corazón, soy María. Respira hondo y cuéntame qué te preocupa, voy a mirar tu energía despacito.' },
  { name: 'Luna', specialty: 'Energía y caminos', turn: 'morning', greeting: 'Hola cielo, soy Luna. Vamos a mirar qué caminos tienes abiertos y qué energía te está rodeando.' },
  { name: 'Sara', specialty: 'Decisiones sentimentales', turn: 'morning', greeting: 'Hola bonita, soy Sara. Estoy contigo para ayudarte a ver esto con claridad y serenidad.' },
  { name: 'Candela', specialty: 'Rupturas y regresos', turn: 'afternoon', greeting: 'Hola cielo, soy Candela. Vamos a mirar con calma lo que está pasando en tu vínculo.' },
  { name: 'Noa', specialty: 'Destino y crecimiento', turn: 'afternoon', greeting: 'Hola corazón, soy Noa. Cuéntame lo que sientes y lo vamos viendo paso a paso.' },
  { name: 'Violeta', specialty: 'Alma gemela', turn: 'afternoon', greeting: 'Hola cielo, soy Violeta. Estoy aquí para mirar lo que te une a esa persona.' },
  { name: 'Rocío', specialty: 'Celos e infidelidad', turn: 'afternoon', greeting: 'Hola bonita, soy Rocío. Voy a mirar con sinceridad esta situación para darte claridad.' },
  { name: 'Alma', specialty: 'Espiritualidad', turn: 'night', greeting: 'Hola cielo, soy Alma. Respira y cuéntame despacito qué necesitas mirar hoy.' },
  { name: 'Nerea', specialty: 'Respuestas rápidas', turn: 'night', greeting: 'Hola corazón, soy Nerea. Dime tu consulta y voy directa a lo importante.' },
  { name: 'Mara', specialty: 'Medium', turn: 'night', greeting: 'Hola cielo, soy Mara. Voy a acompañarte para mirar esto con profundidad.' },
  { name: 'Estela', specialty: 'Dinero y prosperidad', turn: 'night', greeting: 'Hola bonita, soy Estela. Cuéntame qué te preocupa y lo vemos con claridad.' }
]

function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function getCurrentShift() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 14) return 'morning'
  if (hour >= 14 && hour < 22) return 'afternoon'
  return 'night'
}

function buildReaders(activeReaderName) {
  const currentShift = getCurrentShift()
  return ALL_READERS.map((reader) => {
    if (reader.turn !== currentShift) {
      return { ...reader, status: 'Offline' }
    }
    if (activeReaderName && activeReaderName === reader.name) {
      return { ...reader, status: 'Ocupada' }
    }
    return { ...reader, status: 'Libre' }
  })
}

function classifyTopic(text) {
  const lower = normalizeText(text)
  if (lower.includes('amor') || lower.includes('ex') || lower.includes('pareja') || lower.includes('volver') || lower.includes('relacion')) return 'amor'
  if (lower.includes('trabajo') || lower.includes('dinero') || lower.includes('econom')) return 'trabajo'
  if (lower.includes('energia') || lower.includes('espiritual') || lower.includes('camino')) return 'energia'
  if (lower.includes('familia') || lower.includes('hijo') || lower.includes('madre') || lower.includes('padre')) return 'familia'
  if (lower.includes('duda') || lower.includes('decision')) return 'decision'
  return 'general'
}

function isRealQuestion(text) {
  const lower = normalizeText(text)
  if (!lower) return false
  const ignored = [
    'hola', 'buenas', 'vale', 'ok', 'gracias', 'perfecto', 'si', 'sí',
    'soy piscis', 'soy aries', 'soy tauro', 'soy geminis', 'soy cáncer',
    'soy cancer', 'soy leo', 'soy virgo', 'soy libra', 'soy escorpio',
    'soy sagitario', 'soy capricornio', 'soy acuario'
  ]
  if (ignored.includes(lower)) return false
  if (lower.length < 8) return false
  return (
    lower.includes('?') ||
    lower.includes('quiero saber') ||
    lower.includes('me gustaria saber') ||
    lower.includes('me gustaría saber') ||
    lower.includes('va a volver') ||
    lower.includes('volvera') ||
    lower.includes('volverá') ||
    lower.includes('esta con') ||
    lower.includes('está con') ||
    lower.includes('que siente') ||
    lower.includes('qué siente') ||
    lower.includes('como me ira') ||
    lower.includes('cómo me irá') ||
    lower.includes('quiero consultar')
  )
}

export default function ChatPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [step, setStep] = useState('loading')
  const [mode, setMode] = useState('central')
  const [activeReader, setActiveReader] = useState(null)
  const [credits, setCredits] = useState(0)
  const [freeQuestionUsed, setFreeQuestionUsed] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingLabel, setTypingLabel] = useState('Central está escribiendo...')
  const [reservationMode, setReservationMode] = useState(false)
  const [reservationReader, setReservationReader] = useState('')
  const [reservationDay, setReservationDay] = useState('')
  const [reservationTime, setReservationTime] = useState('')
  const [reservationNote, setReservationNote] = useState('')
  const [currentTopic, setCurrentTopic] = useState('general')
  const [readerStage, setReaderStage] = useState('intro')
  const [questionConsumed, setQuestionConsumed] = useState(false)
  const messagesRef = useRef(null)
  const timeoutRef = useRef([])
  const scrollLockRef = useRef(true)

  const readers = useMemo(() => buildReaders(activeReader), [activeReader])

  useEffect(() => {
    const init = async () => {
      if (!supabase) {
        alert('Falta configurar Supabase')
        return
      }

      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        window.location.href = '/auth/login'
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle()

      if (!profileData) {
        setStep('askData')
      } else {
        setProfile(profileData)
        setCredits(profileData.credits || 0)
        setStep('chat')
        addDelayedMessage(
          'central',
          `Hola ${profileData.display_name}, bienvenida de nuevo a Tarot Celestial 💫 Estoy aquí contigo. Cuéntame con calma qué te preocupa en este momento y te ayudaré a elegir la mejor energía para tu consulta.`,
          1100,
          'Central está escribiendo...'
        )
      }

      setLoading(false)
    }

    init()
    return () => timeoutRef.current.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const el = messagesRef.current
    if (!el) return
    if (scrollLockRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isTyping])

  const onMessagesScroll = () => {
    const el = messagesRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    scrollLockRef.current = distanceFromBottom < 80
  }

  const queueTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay)
    timeoutRef.current.push(id)
  }

  const pushMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }])
  }

  const addDelayedMessage = (sender, text, delay = 1200, label = 'Central está escribiendo...') => {
    setTypingLabel(label)
    setIsTyping(true)
    queueTimeout(() => {
      pushMessage(sender, text)
      setIsTyping(false)
    }, delay)
  }

  const createHumanTypingSequence = (sender, text, totalDelay, label) => {
    setTypingLabel(label)
    setIsTyping(true)
    queueTimeout(() => {
      setIsTyping(false)
    }, Math.max(500, totalDelay * 0.35))
    queueTimeout(() => {
      setTypingLabel(label)
      setIsTyping(true)
    }, Math.max(900, totalDelay * 0.55))
    queueTimeout(() => {
      pushMessage(sender, text)
      setIsTyping(false)
    }, totalDelay)
  }

  const saveProfile = async () => {
    if (!name.trim() || !country.trim()) {
      alert('Escribe tu nombre y tu país')
      return
    }

    const { data: authData } = await supabase.auth.getUser()

    const newProfile = {
      auth_user_id: authData.user.id,
      display_name: name.trim(),
      country: country.trim(),
      credits: 0
    }

    const { error } = await supabase.from('profiles').insert(newProfile)

    if (error) {
      alert(error.message || 'No se pudo guardar el perfil')
      return
    }

    setProfile(newProfile)
    setCredits(0)
    setStep('chat')
    addDelayedMessage(
      'central',
      `Perfecto ${name.trim()}, como es tu primera vez en Tarot Celestial tienes una consulta gratis. Cuéntame el tema que quieres mirar y te recomendaré a la tarotista ideal para ti.`,
      1200,
      'Central está escribiendo...'
    )
  }

  const connectToReader = (readerName, topic = 'general') => {
    const reader = ALL_READERS.find((item) => item.name === readerName)
    if (!reader) return

    setMode('connecting')
    setActiveReader(readerName)
    setCurrentTopic(topic)
    setQuestionConsumed(false)
    setReaderStage('intro')
    setInput('')

    queueTimeout(() => {
      setMode('reader')
      setMessages([{ sender: 'reader', text: reader.greeting }])
    }, 1800)
  }

  const backToCentral = (customMessage) => {
    setMode('central')
    setActiveReader(null)
    setMessages([])
    setInput('')
    setQuestionConsumed(false)
    setReaderStage('intro')
    addDelayedMessage(
      'central',
      customMessage || `Ya estoy contigo otra vez, cielo 💫 Dime si quieres seguir con tu consulta, activar créditos o dejar una reserva preparada.`,
      1000,
      'Central está escribiendo...'
    )
  }

  const spendCreditIfNeeded = async () => {
    if (!freeQuestionUsed) {
      setFreeQuestionUsed(true)
      return true
    }

    if (credits <= 0) {
      setMode('central')
      setActiveReader(null)
      addDelayedMessage(
        'central',
        'Cielo, para seguir profundizando contigo necesito activarte créditos. Cuando quieras puedes comprarlos desde la derecha y seguimos justo donde lo hemos dejado 💫',
        1100,
        'Central está escribiendo...'
      )
      return false
    }

    const { data: auth } = await supabase.auth.getUser()
    const { data: current } = await supabase
      .from('profiles')
      .select('credits')
      .eq('auth_user_id', auth.user.id)
      .single()

    const newCredits = Math.max((current?.credits || 0) - 1, 0)

    await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('auth_user_id', auth.user.id)

    setCredits(newCredits)
    return true
  }

  const createReservation = async () => {
    if (!reservationReader || !reservationDay || !reservationTime) {
      alert('Selecciona tarotista, día y hora')
      return
    }

    let reservedFor = null
    try {
      reservedFor = new Date(`${reservationDay}T${reservationTime}:00`).toISOString()
    } catch (e) {
      reservedFor = null
    }

    if (reservedFor) {
      await supabase.from('reservations').insert({
        profile_id: profile?.id,
        reader_name: reservationReader,
        reserved_for: reservedFor,
        status: 'confirmed',
        notes: reservationNote
      })
    }

    setReservationMode(false)
    setReservationReader('')
    setReservationDay('')
    setReservationTime('')
    setReservationNote('')

    addDelayedMessage(
      'central',
      `Perfecto cielo 💫 Ya te he dejado anotada la reserva con ${reservationReader}. Queda guardada en el sistema para que no se pierda tu cita.`,
      1200,
      'Central está escribiendo...'
    )
  }

  const centralReplyForTopic = (topic) => {
    if (topic === 'amor') {
      return {
        reader: 'Aurora',
        text: 'Por lo que me estás contando, la energía se me va claramente a Aurora. Tiene una sensibilidad muy especial para amor, reconciliaciones y vínculos que todavía siguen moviéndose aunque haya distancia. Te la paso ahora mismo, cielo 💫'
      }
    }
    if (topic === 'trabajo') {
      return {
        reader: 'María',
        text: 'Para trabajo y estabilidad, la mejor vibración que tengo libre ahora mismo es la de María. Ella suele ver muy rápido bloqueos, cambios y oportunidades. Si te parece bien, te la paso ya mismo.'
      }
    }
    if (topic === 'energia') {
      return {
        reader: 'Luna',
        text: 'Aquí la energía me lleva mucho a Luna. Es muy buena leyendo caminos, intuición y cargas que se sienten pero no se terminan de entender. Voy a pasarte con ella.'
      }
    }
    if (topic === 'decision') {
      return {
        reader: 'Sara',
        text: 'Cuando hay dudas del corazón y una decisión importante encima, Sara suele dar mucha claridad. Te la paso ahora mismo para que no pierdas ese hilo que traes.'
      }
    }
    if (topic === 'familia') {
      return {
        reader: 'María',
        text: 'Para familia y emociones profundas, María conecta muy rápido. Voy a pasarte con ella para que puedas empezar a mirar esto con calma.'
      }
    }
    return {
      reader: 'Aurora',
      text: 'Déjame sentir un momento tu energía, cielo... lo mejor es pasarte con una tarotista para que pueda empezar a abrir la consulta contigo con más calma. Voy a dejarte con Aurora.'
    }
  }

  const handleCentralLogic = (text) => {
    const lower = normalizeText(text)

    if (lower.includes('reserv')) {
      setReservationMode(true)
      addDelayedMessage('central', 'Claro cielo 💫 Te preparo la reserva. Elige tarotista, día y hora y te la dejo anotada.', 1000, 'Central está escribiendo...')
      return
    }

    if (lower.includes('precio') || lower.includes('credit') || lower.includes('pagar') || lower.includes('comprar')) {
      addDelayedMessage(
        'central',
        'Ahora mismo tienes 3 preguntas por 3€, 5 preguntas por 4,50€ y 10 preguntas por 7€. Si sientes que quieres profundizar de verdad, desde la derecha puedes activar tus créditos y volver sin perder el hilo de la consulta 💫',
        1300,
        'Central está escribiendo...'
      )
      return
    }

    const topic = classifyTopic(text)
    setCurrentTopic(topic)
    const reply = centralReplyForTopic(topic)
    createHumanTypingSequence('central', reply.text, 2400, 'Central está escribiendo...')
    queueTimeout(() => connectToReader(reply.reader, topic), 2800)
  }

  const handleReaderLogic = async (text) => {
    const lower = normalizeText(text)

    if (lower.includes('central') || lower.includes('volver')) {
      backToCentral(`Ya estoy contigo otra vez, cielo 💫 ${activeReader} me deja contigo para que decidas si quieres seguir, comprar créditos o reservar.`)
      return
    }

    if (readerStage === 'intro') {
      setReaderStage('details')
      addDelayedMessage(
        'reader',
        `Claro cielo. Para empezar bien contigo, necesito que me digas tu signo y que me expliques un poquito mejor la situación que quieres mirar. Así entro mejor en tu energía.`,
        2200,
        `${activeReader} está escribiendo...`
      )
      return
    }

    if (!questionConsumed && isRealQuestion(text)) {
      const allowed = await spendCreditIfNeeded()
      if (!allowed) return

      setQuestionConsumed(true)
      setReaderStage('followup')

      createHumanTypingSequence(
        'reader',
        `Estoy entrando en tu consulta, cielo... dame un momento porque quiero mirarlo con calma antes de decirte lo primero que me venga. Lo que siento de momento es que aquí hay movimiento, pero también bloqueo emocional y orgullo. No veo esto cerrado del todo.`,
        5200,
        `${activeReader} está escribiendo...`
      )
      return
    }

    if (readerStage === 'followup') {
      setReaderStage('deeper')
      addDelayedMessage(
        'reader',
        `Puedo seguir profundizando contigo, cielo, y aquí ya hay bastante más que mirar. Si quieres entrar más al detalle, seguimos y lo vemos con más profundidad.`,
        2600,
        `${activeReader} está escribiendo...`
      )
      return
    }

    const allowed = await spendCreditIfNeeded()
    if (!allowed) return

    createHumanTypingSequence(
      'reader',
      `Sigo contigo, cielo. Cuanto más me cuentas, más se mueve la lectura. Aquí todavía hay cosas importantes por abrir, así que si quieres seguimos profundizando despacito.`,
      4200,
      `${activeReader} está escribiendo...`
    )
  }

  const handleSend = async () => {
    if (!input.trim() || mode === 'connecting') return

    const current = input.trim()
    pushMessage('client', current)
    setInput('')

    if (mode === 'central') {
      handleCentralLogic(current)
      return
    }

    if (mode === 'reader') {
      await handleReaderLogic(current)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#5b2c83', fontSize: 18 }}>Cargando Tarot Celestial...</div>
      </div>
    )
  }

  if (step === 'askData') {
    return (
      <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 560, background: '#ffffff', borderRadius: 24, padding: 32, boxShadow: '0 20px 60px rgba(88, 41, 125, 0.12)', border: '1px solid #f0e3bf' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/logo.png" alt="Tarot Celestial" style={{ width: 88, height: 88, objectFit: 'contain', marginBottom: 16 }} />
            <h1 style={{ margin: 0, color: '#5b2c83' }}>Bienvenida a Tarot Celestial</h1>
            <p style={{ color: '#8a6a2f', marginTop: 10 }}>Antes de empezar, dime tu nombre y el país desde el que nos escribes.</p>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4' }} />
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Tu país" style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4' }} />
            <button onClick={saveProfile} style={{ padding: '14px 18px', borderRadius: 14, border: 'none', background: '#6f3ea8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Continuar al chat
            </button>
          </div>
        </div>
      </main>
    )
  }

  const onlineReaders = readers.filter((r) => r.status !== 'Offline')
  const offlineReaders = readers.filter((r) => r.status === 'Offline')

  return (
    <main style={{ height: '100vh', overflow: 'hidden', background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)', padding: 20, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1380, height: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="Tarot Celestial" style={{ width: 54, height: 54, objectFit: 'contain' }} />
            <div>
              <div style={{ color: '#5b2c83', fontWeight: 800, fontSize: 22 }}>Tarot Celestial</div>
              <div style={{ color: '#8a6a2f', fontSize: 14 }}>Siempre a tu lado</div>
            </div>
          </div>

          <button onClick={handleLogout} style={{ border: '1px solid #d8c082', background: '#fff', color: '#6f3ea8', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 }}>
            Cerrar sesión
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr) 280px', gap: 18, flex: 1, minHeight: 0 }}>
          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', overflowY: 'auto' }}>
            <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Tarotistas en línea</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {onlineReaders.map((reader) => (
                <button
                  key={reader.name}
                  disabled={reader.status !== 'Libre'}
                  onClick={() => reader.status === 'Libre' && connectToReader(reader.name, 'manual')}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    background: '#faf7ff',
                    border: '1px solid #ece1ff',
                    textAlign: 'left',
                    cursor: reader.status === 'Libre' ? 'pointer' : 'default'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ color: '#4a2468' }}>{reader.name}</strong>
                    <span style={{ color: reader.status === 'Libre' ? '#1f8b4c' : '#c17a00', fontSize: 12, fontWeight: 700 }}>
                      {reader.status}
                    </span>
                  </div>
                  <div style={{ color: '#7a6690', fontSize: 13, marginTop: 4 }}>{reader.specialty}</div>
                </button>
              ))}
            </div>

            <h3 style={{ color: '#5b2c83', marginTop: 22 }}>Tarotistas offline</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {offlineReaders.map((reader) => (
                <div key={reader.name} style={{ padding: 12, borderRadius: 14, background: '#fffaf1', border: '1px solid #f1e1b8' }}>
                  <strong style={{ color: '#6d5832' }}>{reader.name}</strong>
                  <div style={{ color: '#8c7a58', fontSize: 13, marginTop: 4 }}>{reader.specialty}</div>
                </div>
              ))}
            </div>
          </aside>

          <section style={{ background: '#fff', borderRadius: 22, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: 18, borderBottom: '1px solid #f1e7cd', flexShrink: 0 }}>
              <div style={{ color: '#5b2c83', fontWeight: 800, fontSize: 20 }}>
                {mode === 'reader' ? activeReader : mode === 'connecting' ? `Conectando con ${activeReader}...` : 'Central Tarot Celestial'}
              </div>
              <div style={{ color: '#8a6a2f', fontSize: 14 }}>
                {profile?.display_name ? `Atendiendo a ${profile.display_name}${profile.country ? ` · ${profile.country}` : ''}` : 'Atención personalizada'}
              </div>
            </div>

            {reservationMode && (
              <div style={{ padding: 18, borderBottom: '1px solid #f1e7cd', background: '#fffaf1', flexShrink: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <select value={reservationReader} onChange={(e) => setReservationReader(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid #dccca4' }}>
                    <option value="">Tarotista</option>
                    {ALL_READERS.map((reader) => <option key={reader.name} value={reader.name}>{reader.name}</option>)}
                  </select>
                  <input type="date" value={reservationDay} onChange={(e) => setReservationDay(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid #dccca4' }} />
                  <input type="time" value={reservationTime} onChange={(e) => setReservationTime(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid #dccca4' }} />
                </div>
                <textarea
                  value={reservationNote}
                  onChange={(e) => setReservationNote(e.target.value)}
                  placeholder="Notas opcionales para la reserva"
                  style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 12, border: '1px solid #dccca4', boxSizing: 'border-box', marginBottom: 10 }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={createReservation} style={{ padding: '12px 16px', borderRadius: 12, border: 'none', background: '#6f3ea8', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                    Confirmar reserva
                  </button>
                  <button onClick={() => setReservationMode(false)} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid #dccca4', background: '#fff', color: '#6f3ea8', fontWeight: 800, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesRef} onScroll={onMessagesScroll} style={{ flex: 1, minHeight: 0, padding: 18, overflowY: 'auto', display: 'grid', gap: 12 }}>
              {mode === 'connecting' ? (
                <div style={{ textAlign: 'center', color: '#8a6a2f', fontWeight: 700 }}>Un momento, cielo. Te estoy pasando con {activeReader}...</div>
              ) : (
                messages.map((message, index) => {
                  const isClient = message.sender === 'client'
                  const label = isClient ? '' : message.sender === 'reader' ? (activeReader || 'TAROTISTA').toUpperCase() : 'CENTRAL'
                  return (
                    <div key={index} style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '75%',
                        padding: '14px 16px',
                        borderRadius: 18,
                        background: isClient ? '#6f3ea8' : '#faf6ff',
                        color: isClient ? '#fff' : '#4b2a67',
                        border: isClient ? 'none' : '1px solid #eadcf8'
                      }}>
                        {!isClient && <div style={{ fontSize: 12, fontWeight: 700, color: '#8a6a2f', marginBottom: 6 }}>{label}</div>}
                        <div style={{ lineHeight: 1.6 }}>{message.text}</div>
                      </div>
                    </div>
                  )
                })
              )}

              {isTyping && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#faf6ff', border: '1px solid #eadcf8', borderRadius: 18, padding: '12px 16px', color: '#7a6690' }}>
                    {typingLabel}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 18, borderTop: '1px solid #f1e7cd', display: 'flex', gap: 12, flexShrink: 0 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={mode === 'reader' ? 'Escribe tu consulta...' : 'Escribe aquí tu mensaje...'}
                style={{ flex: 1, padding: '14px 16px', borderRadius: 16, border: '1px solid #dccca4', outline: 'none' }}
              />
              <button onClick={handleSend} style={{ padding: '14px 18px', borderRadius: 16, border: 'none', background: '#6f3ea8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Enviar
              </button>
            </div>
          </section>

          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', overflowY: 'auto' }}>
            <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Tus créditos</h3>
            <div style={{ padding: 16, borderRadius: 16, background: '#fffaf1', border: '1px solid #f0dfb2', marginBottom: 14 }}>
              <div style={{ color: '#8a6a2f', fontSize: 13 }}>Saldo actual</div>
              <div style={{ color: '#5b2c83', fontSize: 30, fontWeight: 800, marginTop: 4 }}>{credits}</div>
              <div style={{ color: '#8c7a58', fontSize: 13 }}>
                {freeQuestionUsed ? 'La consulta gratis ya está en uso' : 'Incluye tu primera consulta gratuita'}
              </div>
            </div>

            <a href="/payment" style={{
              display: 'block',
              textAlign: 'center',
              width: '100%',
              padding: '14px 16px',
              borderRadius: 14,
              border: 'none',
              background: '#d6ad45',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
              marginBottom: 10,
              textDecoration: 'none',
              boxSizing: 'border-box'
            }}>
              Comprar créditos
            </a>

            <button
              onClick={() => backToCentral()}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4', background: '#fff', color: '#6f3ea8', fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}
            >
              Volver con el central
            </button>

            <button
              onClick={() => {
                setReservationMode(true)
                if (mode !== 'central') backToCentral('Perfecto cielo 💫 te llevo al central para dejarte la reserva preparada.')
              }}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4', background: '#fff', color: '#6f3ea8', fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}
            >
              Reservar consulta
            </button>

            <div style={{ padding: 14, borderRadius: 16, background: '#faf7ff', border: '1px solid #ece1ff' }}>
              <div style={{ color: '#5b2c83', fontWeight: 700, marginBottom: 8 }}>Ofertas de hoy</div>
              <div style={{ color: '#7a6690', fontSize: 14, lineHeight: 1.6 }}>
                3 preguntas por 3€<br />
                5 preguntas por 4,50€<br />
                10 preguntas por 7€
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

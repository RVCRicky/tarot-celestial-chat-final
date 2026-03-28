
'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const ONLINE_READERS = [
  {
    name: 'Aurora',
    specialty: 'Amor y reconciliaciones',
    status: 'Libre',
    greeting: 'Hola cielo, soy Aurora de Tarot Celestial. Estoy contigo para mirar tu consulta con calma. ¿En qué te gustaría que profundizáramos hoy?',
    pitch: 'Aurora es de las más queridas para amor y reconciliaciones.'
  },
  {
    name: 'María',
    specialty: 'Videncia natural',
    status: 'Libre',
    greeting: 'Hola corazón, soy María. Cuéntame despacito tu situación y voy mirando tu energía.',
    pitch: 'María conecta muy bien con emociones y bloqueos.'
  },
  {
    name: 'Luna',
    specialty: 'Energía y caminos',
    status: 'Ocupada',
    greeting: 'Hola cielo, soy Luna. Vamos a mirar los caminos que tienes abiertos ahora mismo.',
    pitch: 'Luna es muy buena leyendo energía y caminos.'
  },
  {
    name: 'Sara',
    specialty: 'Decisiones sentimentales',
    status: 'Libre',
    greeting: 'Hola bonita, soy Sara. Si estás entre dudas o decisiones del corazón, te ayudo a verlo claro.',
    pitch: 'Sara da mucha claridad en decisiones sentimentales.'
  }
]

const OFFLINE_READERS = [
  { name: 'Estela', specialty: 'Trabajo y dinero' },
  { name: 'Violeta', specialty: 'Alma gemela' },
  { name: 'Noa', specialty: 'Crecimiento personal' },
  { name: 'Candela', specialty: 'Rupturas y regresos' },
  { name: 'Mara', specialty: 'Medium espiritual' },
  { name: 'Rocío', specialty: 'Celos e infidelidad' },
  { name: 'Alma', specialty: 'Destino amoroso' },
  { name: 'Nerea', specialty: 'Respuestas rápidas' }
]

function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export default function ChatPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [step, setStep] = useState('loading')
  const [mode, setMode] = useState('central')
  const [selectedReader, setSelectedReader] = useState(null)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState([])
  const [hasAskedTopic, setHasAskedTopic] = useState(false)
  const [consultTopic, setConsultTopic] = useState(null)
  const [readerPhase, setReaderPhase] = useState('intro')
  const [freeQuestionUsed, setFreeQuestionUsed] = useState(false)
  const [credits] = useState(1)
  const [pendingRecommendation, setPendingRecommendation] = useState(null)

  const messagesContainerRef = useRef(null)
  const shouldStickToBottomRef = useRef(true)
  const typingTimeoutRef = useRef(null)
  const delayedTimeoutsRef = useRef([])

  useEffect(() => {
    const init = async () => {
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
        setStep('chat')
        addDelayedCentralMessage(
          `Hola ${profileData.display_name}, bienvenida de nuevo a Tarot Celestial. Estoy aquí contigo, cielo. Cuéntame con calma qué te preocupa hoy y te ayudo a elegir a la mejor tarotista.`,
          900
        )
        setHasAskedTopic(true)
      }

      setLoading(false)
    }

    init()

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      delayedTimeoutsRef.current.forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return

    if (shouldStickToBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isTyping])

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldStickToBottomRef.current = distanceFromBottom < 80
  }

  const addMessageNow = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }])
  }

  const addDelayedMessage = (sender, text, delay = 1500) => {
    setIsTyping(true)

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    const timeout = setTimeout(() => {
      addMessageNow(sender, text)
      setIsTyping(false)
    }, delay)

    delayedTimeoutsRef.current.push(timeout)
  }

  const addDelayedCentralMessage = (text, delay = 1500) => {
    addDelayedMessage('central', text, delay)
  }

  const addDelayedReaderMessage = (text, delay = 2500) => {
    addDelayedMessage('reader', text, delay)
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
      country: country.trim()
    }

    const { error } = await supabase.from('profiles').insert(newProfile)

    if (error) {
      alert('No se pudo guardar el perfil')
      return
    }

    setProfile(newProfile)
    setStep('chat')
    addDelayedCentralMessage(
      `Perfecto ${name.trim()}, como es tu primera vez en Tarot Celestial tienes una consulta gratis. Dime el tema que quieres mirar y te recomiendo a la tarotista ideal.`,
      900
    )
    setHasAskedTopic(true)
  }

  const goToReader = (readerName, topic = 'amor') => {
    const reader = ONLINE_READERS.find((r) => normalizeText(r.name) === normalizeText(readerName))
    if (!reader) return

    setMode('connecting')
    setSelectedReader(reader)
    setConsultTopic(topic)
    setPendingRecommendation(null)

    const timeout = setTimeout(() => {
      setMode('reader')
      setMessages([
        { sender: 'reader', text: reader.greeting }
      ])
      setReaderPhase('intro')
    }, 1800)

    delayedTimeoutsRef.current.push(timeout)
  }

  const backToCentral = (message) => {
    setMode('central')
    setSelectedReader(null)
    setReaderPhase('intro')
    setMessages([])
    setInput('')
    setPendingRecommendation(null)

    const greeting =
      message ||
      `Hola ${profile?.display_name || 'cielo'}, ya estoy otra vez contigo en central. Cuéntame tranquila qué necesitas y te ayudo.`

    addDelayedCentralMessage(greeting, 900)
  }

  const recommendReader = (readerName, topic, customText) => {
    setConsultTopic(topic)
    setPendingRecommendation(readerName)
    addDelayedCentralMessage(customText, 1800)
  }

  const handleCentralMessage = (currentInput) => {
    const lower = normalizeText(currentInput)

    if (!hasAskedTopic) {
      addDelayedCentralMessage(
        `Cuéntame cielo, ¿qué deseas consultar hoy? Amor, trabajo, familia o energía.`,
        1000
      )
      setHasAskedTopic(true)
      return
    }

    if (pendingRecommendation && (
      lower === 'si' ||
      lower === 'sí' ||
      lower.includes('pasame') ||
      lower.includes('pasame con ella') ||
      lower.includes('pasame con el') ||
      lower.includes('de acuerdo') ||
      lower.includes('vale') ||
      lower.includes('perfecto') ||
      lower.includes('ok')
    )) {
      addDelayedCentralMessage(`Perfecto cielo, te paso ahora mismo con ${pendingRecommendation}.`, 1000)
      const timeout = setTimeout(() => goToReader(pendingRecommendation, consultTopic || 'general'), 1300)
      delayedTimeoutsRef.current.push(timeout)
      return
    }

    if (lower.includes('aurora')) {
      addDelayedCentralMessage('Perfecto cielo, te voy a pasar con Aurora. Dame un instante.', 1000)
      const timeout = setTimeout(() => goToReader('Aurora', consultTopic || 'amor'), 1300)
      delayedTimeoutsRef.current.push(timeout)
      return
    }

    if (lower.includes('maria')) {
      addDelayedCentralMessage('Perfecto cielo, te paso con María ahora mismo.', 1000)
      const timeout = setTimeout(() => goToReader('María', consultTopic || 'general'), 1300)
      delayedTimeoutsRef.current.push(timeout)
      return
    }

    if (
      lower.includes('amor') ||
      lower.includes('pareja') ||
      lower.includes('volver') ||
      lower.includes('ex') ||
      lower.includes('relacion') ||
      lower.includes('relación')
    ) {
      recommendReader(
        'Aurora',
        'amor',
        'De las chicas que tengo libres ahora mismo, Aurora es de las más queridas para amor y reconciliaciones. Tiene muchísima mano para este tipo de consultas. Si quieres, te paso con ella ahora mismo.'
      )
      return
    }

    if (lower.includes('trabajo') || lower.includes('dinero') || lower.includes('economia') || lower.includes('economía')) {
      recommendReader(
        'María',
        'trabajo',
        'Para orientarte ya mismo, María puede mirarte muy bien la energía general y los bloqueos que tengas. Si quieres, te paso con ella ahora mismo mientras dejamos también anotada una reserva con Estela para trabajo.'
      )
      return
    }

    if (lower.includes('familia') || lower.includes('hijo') || lower.includes('madre') || lower.includes('padre')) {
      recommendReader(
        'María',
        'familia',
        'Para temas de familia y emociones, María suele conectar enseguida. Si te parece bien, te paso con ella ahora mismo.'
      )
      return
    }

    if (lower.includes('energia') || lower.includes('energía') || lower.includes('espiritual') || lower.includes('camino')) {
      recommendReader(
        'Luna',
        'energía',
        'Luna es muy buena en energía y caminos, pero ahora la tengo ocupada. Si quieres, puedo dejarte con Sara o María para empezar, o tomarte una reserva con Luna.'
      )
      return
    }

    if (lower.includes('precio') || lower.includes('creditos') || lower.includes('creditos') || lower.includes('preguntas')) {
      const userCountry = profile?.country || country || 'tu país'
      addDelayedCentralMessage(
        `Claro cielo. Ahora mismo para ${userCountry} tengo estas ofertas: 3 preguntas por 3€, 5 preguntas por 4,50€ y 10 preguntas por 7€. Tú me dices cuál te encaja más y te lo preparo.`,
        1400
      )
      return
    }

    if (lower.includes('reserva') || lower.includes('reservar') || lower.includes('cita')) {
      addDelayedCentralMessage(
        'Claro cielo, te lo preparo sin problema. En el siguiente paso dejaremos ya la reserva guardada con email automático, pero la idea es justo esa: que yo desde central te la gestione.',
        1400
      )
      return
    }

    if (lower.includes('hola') || lower.includes('buenas') || lower.includes('buenos dias') || lower.includes('buenas tardes')) {
      addDelayedCentralMessage(
        `Hola cielo, encantada de atenderte. Cuéntame qué te preocupa y te ayudo a elegir a la mejor tarotista para ti.`,
        1100
      )
      return
    }

    addDelayedCentralMessage(
      'Te entiendo, cielo. Para orientarte bien, dime si lo que más te preocupa ahora mismo es amor, trabajo, familia o energía, y así no te hago perder tiempo con una tarotista que no sea la ideal para ti.',
      1500
    )
  }

  const handleReaderMessage = (currentInput) => {
    const lower = normalizeText(currentInput)

    if (readerPhase === 'intro') {
      setReaderPhase('details')
      addDelayedReaderMessage(
        'Claro cielo. Para empezar bien, dime tu signo y explícame un poquito mejor la situación que quieres mirar conmigo.',
        2200
      )
      return
    }

    if (!freeQuestionUsed && (
      lower.includes('quiero saber') ||
      lower.includes('?') ||
      lower.includes('va a volver') ||
      lower.includes('volvera') ||
      lower.includes('esta con alguien') ||
      lower.includes('esta con otra') ||
      lower.includes('me quiere')
    )) {
      setFreeQuestionUsed(true)
      setReaderPhase('followup')
      addDelayedReaderMessage(
        'Voy a mirártelo despacio, cielo. Dame un momento para conectar con tu energía y con la situación.',
        3200
      )

      const timeout = setTimeout(() => {
        addDelayedReaderMessage(
          'Por lo que me marca la tirada, sí veo intención de acercamiento, pero también veo mucho orgullo y bastante bloqueo emocional. Hay sentimientos, aunque ahora mismo no fluye todo como debería.',
          4200
        )
      }, 600)

      delayedTimeoutsRef.current.push(timeout)
      return
    }

    if (readerPhase === 'followup') {
      setReaderPhase('paid')
      addDelayedReaderMessage(
        'Puedo seguir contigo, cielo, pero para profundizar un poco más necesito que el central te active créditos. Te voy a devolver con él para que no pierdas el hilo de tu consulta.',
        2400
      )
      const timeout = setTimeout(() => {
        backToCentral(`Hola ${profile?.display_name || 'cielo'}, Aurora me comenta que la consulta va bien encaminada. Si quieres seguir profundizando, te activo ahora mismo un paquete de créditos y te la vuelvo a pasar.`)
      }, 3400)
      delayedTimeoutsRef.current.push(timeout)
      return
    }

    addDelayedReaderMessage(
      'Te sigo leyendo, cielo. Cuéntame un poquito más para ir afinando la energía.',
      2000
    )
  }

  const handleSend = () => {
    if (!input.trim() || mode === 'connecting') return

    const currentInput = input.trim()
    addMessageNow('client', currentInput)
    setInput('')

    if (mode === 'central') {
      handleCentralMessage(currentInput)
      return
    }

    if (mode === 'reader') {
      handleReaderMessage(currentInput)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f5ff' }}>
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
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4', outline: 'none' }}
            />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Tu país"
              style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4', outline: 'none' }}
            />
            <button
              onClick={saveProfile}
              style={{ padding: '14px 18px', borderRadius: 14, border: 'none', background: '#6f3ea8', color: 'white', fontWeight: 700, cursor: 'pointer' }}
            >
              Continuar al chat
            </button>
          </div>
        </div>
      </main>
    )
  }

  const chatTitle = mode === 'reader' && selectedReader ? selectedReader.name : 'Central Tarot Celestial'
  const chatSubtitle =
    mode === 'reader' && selectedReader
      ? `${selectedReader.specialty} · Consulta en curso`
      : `${profile?.display_name ? `Atendiendo a ${profile.display_name}` : 'Atención personalizada'}${profile?.country ? ` · ${profile.country}` : ''}`

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

          <button
            onClick={handleLogout}
            style={{ border: '1px solid #d8c082', background: '#fff', color: '#6f3ea8', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 }}
          >
            Cerrar sesión
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr) 280px', gap: 18, flex: 1, minHeight: 0 }}>
          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', overflowY: 'auto' }}>
            <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Tarotistas en línea</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {ONLINE_READERS.map((reader) => {
                const computedStatus =
                  selectedReader?.name === reader.name && mode === 'reader'
                    ? 'Ocupada'
                    : reader.status
                return (
                  <div key={reader.name} style={{ padding: 12, borderRadius: 14, background: selectedReader?.name === reader.name ? '#f6efff' : '#faf7ff', border: '1px solid #ece1ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong style={{ color: '#4a2468' }}>{reader.name}</strong>
                      <span style={{ color: computedStatus === 'Libre' ? '#1f8b4c' : '#c17a00', fontSize: 12, fontWeight: 700 }}>
                        {computedStatus}
                      </span>
                    </div>
                    <div style={{ color: '#7a6690', fontSize: 13, marginTop: 4 }}>{reader.specialty}</div>
                  </div>
                )
              })}
            </div>

            <h3 style={{ color: '#5b2c83', marginTop: 22 }}>Tarotistas offline</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {OFFLINE_READERS.map((reader) => (
                <div key={reader.name} style={{ padding: 12, borderRadius: 14, background: '#fffaf1', border: '1px solid #f1e1b8' }}>
                  <strong style={{ color: '#6d5832' }}>{reader.name}</strong>
                  <div style={{ color: '#8c7a58', fontSize: 13, marginTop: 4 }}>{reader.specialty}</div>
                </div>
              ))}
            </div>
          </aside>

          <section style={{ background: '#fff', borderRadius: 22, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: 18, borderBottom: '1px solid #f1e7cd', flexShrink: 0 }}>
              <div style={{ color: '#5b2c83', fontWeight: 800, fontSize: 20 }}>{chatTitle}</div>
              <div style={{ color: '#8a6a2f', fontSize: 14 }}>{chatSubtitle}</div>
            </div>

            {mode === 'connecting' ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, minHeight: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#5b2c83', marginBottom: 10 }}>
                    Conectando con {selectedReader?.name}...
                  </div>
                  <div style={{ color: '#8a6a2f' }}>Un momento, cielo. Te estoy pasando con la tarotista.</div>
                </div>
              </div>
            ) : (
              <>
                <div
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  style={{ flex: 1, minHeight: 0, padding: 18, overflowY: 'auto', display: 'grid', gap: 12 }}
                >
                  {messages.map((message, index) => {
                    const isClient = message.sender === 'client'
                    const isReader = message.sender === 'reader'
                    return (
                      <div key={index} style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '75%',
                          padding: '14px 16px',
                          borderRadius: 18,
                          background: isClient ? '#6f3ea8' : '#faf6ff',
                          color: isClient ? '#fff' : '#4b2a67',
                          border: isClient ? 'none' : '1px solid #eadcf8',
                          boxShadow: '0 8px 20px rgba(88, 41, 125, 0.06)'
                        }}>
                          {!isClient && (
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#8a6a2f', marginBottom: 6 }}>
                              {isReader ? selectedReader?.name?.toUpperCase() || 'TAROTISTA' : 'CENTRAL'}
                            </div>
                          )}
                          <div style={{ lineHeight: 1.5 }}>{message.text}</div>
                        </div>
                      </div>
                    )
                  })}

                  {isTyping && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{ background: '#faf6ff', border: '1px solid #eadcf8', borderRadius: 18, padding: '12px 16px', color: '#7a6690' }}>
                        {mode === 'reader' && selectedReader ? `${selectedReader.name} está escribiendo...` : 'Central está escribiendo...'}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ padding: 18, borderTop: '1px solid #f1e7cd', display: 'flex', gap: 12, flexShrink: 0 }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend()
                    }}
                    placeholder={mode === 'reader' ? 'Escribe tu consulta...' : 'Escribe aquí tu mensaje...'}
                    style={{ flex: 1, padding: '14px 16px', borderRadius: 16, border: '1px solid #dccca4', outline: 'none' }}
                  />
                  <button
                    onClick={handleSend}
                    style={{ padding: '14px 18px', borderRadius: 16, border: 'none', background: '#6f3ea8', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Enviar
                  </button>
                </div>
              </>
            )}
          </section>

          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', overflowY: 'auto' }}>
            <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Tus créditos</h3>
            <div style={{ padding: 16, borderRadius: 16, background: '#fffaf1', border: '1px solid #f0dfb2', marginBottom: 14 }}>
              <div style={{ color: '#8a6a2f', fontSize: 13 }}>Saldo actual</div>
              <div style={{ color: '#5b2c83', fontSize: 30, fontWeight: 800, marginTop: 4 }}>{credits}</div>
              <div style={{ color: '#8c7a58', fontSize: 13 }}>
                {freeQuestionUsed ? 'Tu consulta gratis ya está en uso' : 'Incluye tu primera consulta gratuita'}
              </div>
            </div>

            <button
              onClick={() => backToCentral(`Hola ${profile?.display_name || 'cielo'}, ya estoy otra vez contigo en central. Dime qué necesitas y te ayudo encantado.`)}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: 'none', background: '#d6ad45', color: '#fff', fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}
            >
              Volver con el central
            </button>

            <div style={{ padding: 14, borderRadius: 16, background: '#faf7ff', border: '1px solid #ece1ff', marginBottom: 12 }}>
              <div style={{ color: '#5b2c83', fontWeight: 700, marginBottom: 8 }}>Ofertas de hoy</div>
              <div style={{ color: '#7a6690', fontSize: 14, lineHeight: 1.6 }}>
                3 preguntas por 3€<br />
                5 preguntas por 4,50€<br />
                10 preguntas por 7€
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 16, background: '#fffaf1', border: '1px solid #f1e1b8' }}>
              <div style={{ color: '#8a6a2f', fontWeight: 700, marginBottom: 8 }}>Estado actual</div>
              <div style={{ color: '#6d5832', fontSize: 14, lineHeight: 1.6 }}>
                Modo: {mode === 'reader' ? `Consulta con ${selectedReader?.name || ''}` : mode === 'connecting' ? 'Conectando' : 'Central'}<br />
                Tema: {consultTopic || 'Sin definir'}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}


'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const ONLINE_READERS = [
  {
    name: 'Aurora',
    specialty: 'Amor y reconciliaciones',
    status: 'Libre',
    greeting: 'Hola cielo, soy Aurora de Tarot Celestial. Estoy contigo para mirar tu consulta con calma. ¿En qué te gustaría que profundizáramos hoy?'
  },
  {
    name: 'María',
    specialty: 'Videncia natural',
    status: 'Libre',
    greeting: 'Hola corazón, soy María. Cuéntame despacito tu situación y voy mirando tu energía.'
  },
  {
    name: 'Luna',
    specialty: 'Energía y caminos',
    status: 'Ocupada',
    greeting: 'Hola cielo, soy Luna. Vamos a mirar los caminos que tienes abiertos ahora mismo.'
  },
  {
    name: 'Sara',
    specialty: 'Decisiones sentimentales',
    status: 'Libre',
    greeting: 'Hola bonita, soy Sara. Si estás entre dudas o decisiones del corazón, te ayudo a verlo claro.'
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
  const [consultTopic, setConsultTopic] = useState(null)
  const [readerPhase, setReaderPhase] = useState('intro')
  const [freeQuestionUsed, setFreeQuestionUsed] = useState(false)
  const [credits] = useState(1)
  const [pendingRecommendation, setPendingRecommendation] = useState(null)

  const messagesContainerRef = useRef(null)
  const shouldStickToBottomRef = useRef(true)
  const timeoutsRef = useRef([])

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
          `Hola ${profileData.display_name}, bienvenida de nuevo a Tarot Celestial. Cuéntame qué tema quieres mirar hoy y te recomiendo a la mejor tarotista.`,
          700
        )
      }

      setLoading(false)
    }

    init()

    return () => {
      timeoutsRef.current.forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    if (shouldStickToBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isTyping])

  const onMessagesScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldStickToBottomRef.current = distance < 80
  }

  const queueTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay)
    timeoutsRef.current.push(id)
    return id
  }

  const addMessageNow = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }])
  }

  const addDelayedMessage = (sender, text, delay = 1200) => {
    setIsTyping(true)
    queueTimeout(() => {
      addMessageNow(sender, text)
      setIsTyping(false)
    }, delay)
  }

  const addDelayedCentralMessage = (text, delay = 1200) => addDelayedMessage('central', text, delay)
  const addDelayedReaderMessage = (text, delay = 2200) => addDelayedMessage('reader', text, delay)

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
      `Perfecto ${name.trim()}, como es tu primera vez en Tarot Celestial tienes una consulta gratis. Dime si quieres mirar amor, trabajo, familia o energía y te paso con la chica ideal.`,
      700
    )
  }

  const goToReader = (readerName, topic = 'amor') => {
    const reader = ONLINE_READERS.find((r) => normalizeText(r.name) === normalizeText(readerName))
    if (!reader) return

    setMode('connecting')
    setSelectedReader(reader)
    setConsultTopic(topic)
    setPendingRecommendation(null)

    queueTimeout(() => {
      setMode('reader')
      setMessages([{ sender: 'reader', text: reader.greeting }])
      setReaderPhase('intro')
      setInput('')
    }, 1600)
  }

  const backToCentral = (message) => {
    setMode('central')
    setSelectedReader(null)
    setReaderPhase('intro')
    setMessages([])
    setInput('')
    setPendingRecommendation(null)
    addDelayedCentralMessage(
      message || `Hola ${profile?.display_name || 'cielo'}, ya estoy contigo otra vez en central. Dime si quieres seguir con la consulta o activar créditos.`,
      800
    )
  }

  const recommend = (readerName, topic, text) => {
    setConsultTopic(topic)
    setPendingRecommendation(readerName)
    addDelayedCentralMessage(text, 1500)
  }

  const handleCentralMessage = (raw) => {
    const lower = normalizeText(raw)

    // DIRECT TRANSFERS FIRST
    if (lower.includes('aurora')) {
      addDelayedCentralMessage('Claro cielo, te paso con Aurora ahora mismo.', 800)
      queueTimeout(() => goToReader('Aurora', consultTopic || 'amor'), 1000)
      return
    }

    if (lower.includes('maria')) {
      addDelayedCentralMessage('Perfecto cielo, te paso con María ahora mismo.', 800)
      queueTimeout(() => goToReader('María', consultTopic || 'general'), 1000)
      return
    }

    if (lower.includes('sara')) {
      addDelayedCentralMessage('Perfecto cielo, te paso con Sara en un momento.', 800)
      queueTimeout(() => goToReader('Sara', consultTopic || 'general'), 1000)
      return
    }

    if (pendingRecommendation && (
      lower === 'si' ||
      lower === 'sí' ||
      lower === 'vale' ||
      lower === 'ok' ||
      lower === 'perfecto' ||
      lower === 'de acuerdo' ||
      lower === 'pasame' ||
      lower === 'pasame con ella'
    )) {
      addDelayedCentralMessage(`Perfecto cielo, te paso con ${pendingRecommendation} ahora mismo.`, 800)
      queueTimeout(() => goToReader(pendingRecommendation, consultTopic || 'general'), 1000)
      return
    }

    // TOPICS
    if (
      lower.includes('amor') ||
      lower.includes('pareja') ||
      lower.includes('ex') ||
      lower.includes('volver') ||
      lower.includes('relacion') ||
      lower.includes('reconcili')
    ) {
      recommend(
        'Aurora',
        'amor',
        'Ahora mismo, para amor, la mejor opción que tengo libre es Aurora. Se le da especialmente bien reconciliaciones, bloqueos y terceras personas. Si quieres, te la paso ahora mismo.'
      )
      return
    }

    if (lower.includes('trabajo') || lower.includes('dinero') || lower.includes('economia')) {
      recommend(
        'María',
        'trabajo',
        'Para trabajo y estabilidad, ahora mismo te puedo pasar con María para una orientación inicial. Si quieres, te la paso ya.'
      )
      return
    }

    if (lower.includes('familia') || lower.includes('madre') || lower.includes('padre') || lower.includes('hijo')) {
      recommend(
        'María',
        'familia',
        'Para familia y emociones, María suele conectar enseguida. Si quieres, te la paso ahora mismo.'
      )
      return
    }

    if (lower.includes('energia') || lower.includes('espiritual') || lower.includes('camino')) {
      recommend(
        'Sara',
        'energía',
        'Para energía y decisiones, te puedo pasar con Sara ahora mismo. Si quieres, te la paso ya.'
      )
      return
    }

    if (lower.includes('precio') || lower.includes('credito') || lower.includes('pregunta')) {
      addDelayedCentralMessage(
        'Claro cielo. Ahora mismo tengo 3 preguntas por 3€, 5 preguntas por 4,50€ y 10 preguntas por 7€. Si quieres luego lo integramos ya con pago automático.',
        1200
      )
      return
    }

    if (lower.includes('hola') || lower.includes('buenas')) {
      addDelayedCentralMessage(
        'Hola cielo, encantada de atenderte. Dime qué tema te preocupa y te recomiendo a la mejor tarotista que tenga libre.',
        1000
      )
      return
    }

    addDelayedCentralMessage(
      'Te entiendo, cielo. Cuéntame un poquito mejor qué quieres mirar y yo te digo enseguida con quién te va a ir mejor.',
      1200
    )
  }

  const handleReaderMessage = (raw) => {
    const lower = normalizeText(raw)

    if (readerPhase === 'intro') {
      setReaderPhase('details')
      addDelayedReaderMessage(
        'Claro cielo. Para empezar bien, dime tu signo y explícame un poquito mejor la situación que quieres mirar conmigo.',
        2000
      )
      return
    }

    if (!freeQuestionUsed && (
      lower.includes('quiero saber') ||
      lower.includes('?') ||
      lower.includes('va a volver') ||
      lower.includes('volvera') ||
      lower.includes('esta con alguien') ||
      lower.includes('esta con otra')
    )) {
      setFreeQuestionUsed(true)
      setReaderPhase('followup')
      addDelayedReaderMessage(
        'Voy a mirártelo despacio, cielo. Dame un momento para conectar con tu energía y hacer la tirada.',
        2800
      )
      queueTimeout(() => {
        addDelayedReaderMessage(
          'Por lo que veo, sí hay sentimientos y sí veo acercamiento, pero también orgullo y bloqueo. La situación no está cerrada, cielo.',
          4200
        )
      }, 500)
      return
    }

    if (readerPhase === 'followup') {
      setReaderPhase('paid')
      addDelayedReaderMessage(
        'Puedo seguir profundizando contigo, cielo, pero para eso ya necesito que el central te active créditos. Te devuelvo con él y sigues justo donde lo hemos dejado.',
        2200
      )
      queueTimeout(() => {
        backToCentral(`Hola ${profile?.display_name || 'cielo'}, ${selectedReader?.name || 'la tarotista'} me dice que puede seguir profundizando contigo. Si quieres, te activo ahora mismo un paquete de créditos.`)
      }, 3200)
      return
    }

    addDelayedReaderMessage(
      'Te sigo leyendo, cielo. Cuéntame un poquito más para afinar la energía.',
      1800
    )
  }

  const handleSend = () => {
    if (!input.trim() || mode === 'connecting') return

    const current = input.trim()
    addMessageNow('client', current)
    setInput('')

    if (mode === 'central') {
      handleCentralMessage(current)
      return
    }

    if (mode === 'reader') {
      handleReaderMessage(current)
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
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4', outline: 'none' }} />
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Tu país" style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4', outline: 'none' }} />
            <button onClick={saveProfile} style={{ padding: '14px 18px', borderRadius: 14, border: 'none', background: '#6f3ea8', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
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

          <button onClick={handleLogout} style={{ border: '1px solid #d8c082', background: '#fff', color: '#6f3ea8', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 }}>
            Cerrar sesión
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr) 280px', gap: 18, flex: 1, minHeight: 0 }}>
          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', overflowY: 'auto' }}>
            <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Tarotistas en línea</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {ONLINE_READERS.map((reader) => {
                const computedStatus = selectedReader?.name === reader.name && mode === 'reader' ? 'Ocupada' : reader.status
                return (
                  <button
                    key={reader.name}
                    onClick={() => reader.status === 'Libre' && goToReader(reader.name, consultTopic || 'general')}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: selectedReader?.name === reader.name ? '#f6efff' : '#faf7ff',
                      border: '1px solid #ece1ff',
                      textAlign: 'left',
                      cursor: reader.status === 'Libre' ? 'pointer' : 'default'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong style={{ color: '#4a2468' }}>{reader.name}</strong>
                      <span style={{ color: computedStatus === 'Libre' ? '#1f8b4c' : '#c17a00', fontSize: 12, fontWeight: 700 }}>
                        {computedStatus}
                      </span>
                    </div>
                    <div style={{ color: '#7a6690', fontSize: 13, marginTop: 4 }}>{reader.specialty}</div>
                  </button>
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
                <div ref={messagesContainerRef} onScroll={onMessagesScroll} style={{ flex: 1, minHeight: 0, padding: 18, overflowY: 'auto', display: 'grid', gap: 12 }}>
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

                {mode === 'central' && pendingRecommendation && (
                  <div style={{ padding: '0 18px 12px 18px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => goToReader(pendingRecommendation, consultTopic || 'general')}
                      style={{ padding: '10px 14px', borderRadius: 999, border: 'none', background: '#6f3ea8', color: 'white', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Pasarme con {pendingRecommendation}
                    </button>
                    <button
                      onClick={() => setPendingRecommendation(null)}
                      style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid #dccca4', background: '#fff', color: '#6f3ea8', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Seguir hablando con central
                    </button>
                  </div>
                )}

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

'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  READER_CATALOG,
  getReadersForUI,
  detectTopic,
  findRecommendedReader,
  getPricePackForCountry,
  extractPersonName,
  extractZodiac,
  isRealQuestion,
  isFollowupQuestion,
  normalizeText
} from '../../lib/chatConfig'

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
  const [mainQuestionCharged, setMainQuestionCharged] = useState(false)
  const [followupUsed, setFollowupUsed] = useState(false)
  const [contextMemory, setContextMemory] = useState({
    targetName: '',
    userSign: '',
    targetSign: '',
    lastReader: ''
  })
  const messagesRef = useRef(null)
  const scrollLockRef = useRef(true)
  const timeoutRef = useRef([])

  const readers = useMemo(() => getReadersForUI(activeReader), [activeReader])

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

      const paymentSuccess = typeof window !== 'undefined' ? window.localStorage.getItem('tc_payment_success') : null
      const lastReader = typeof window !== 'undefined' ? window.localStorage.getItem('tc_last_reader') : null

      if (!profileData) {
        setStep('askData')
      } else {
        setProfile(profileData)
        setCredits(profileData.credits || 0)
        setFreeQuestionUsed(profileData.free_question_used || false)
        setStep('chat')

        if (paymentSuccess === '1') {
          if (typeof window !== 'undefined') window.localStorage.removeItem('tc_payment_success')
          addDelayedMessage(
            'central',
            `Perfecto ${profileData.display_name}, ya veo que has realizado el pago y tus créditos están asignados. ${lastReader ? `¿Quieres seguir hablando con ${lastReader} o prefieres probar a otra de nuestras chicas?` : '¿Quieres continuar con tu consulta?'}`,
            1200,
            'Central está escribiendo...'
          )
        } else {
          addDelayedMessage(
            'central',
            `Hola ${profileData.display_name}, bienvenida de nuevo a Tarot Celestial. Estoy aquí contigo, cielo. ¿En qué te puedo ayudar hoy?`,
            1000,
            'Central está escribiendo...'
          )
        }
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
    }, Math.max(900, totalDelay * 0.58))

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
      credits: 0,
      free_question_used: false
    }

    const { error } = await supabase.from('profiles').insert(newProfile)

    if (error) {
      alert(error.message || 'No se pudo guardar el perfil')
      return
    }

    setProfile(newProfile)
    setCredits(0)
    setFreeQuestionUsed(false)
    setStep('chat')
    addDelayedMessage(
      'central',
      `Perfecto ${name.trim()}, como es la primera vez que nos escribes tienes una consulta completamente gratis. Si me dices sobre qué tema quieres consultar, te recomiendo a la mejor tarotista.`,
      1200,
      'Central está escribiendo...'
    )
  }

  const connectToReader = (readerName, topic = 'general') => {
    const reader = READER_CATALOG.find((item) => item.name === readerName)
    if (!reader) return

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tc_last_reader', readerName)
    }

    setMode('connecting')
    setActiveReader(readerName)
    setCurrentTopic(topic)
    setMainQuestionCharged(false)
    setFollowupUsed(false)
    setReaderStage('intro')
    setInput('')
    setContextMemory((prev) => ({ ...prev, lastReader: readerName }))

    queueTimeout(() => {
      setMode('reader')
      setMessages([{ sender: 'reader', text: reader.greeting }])
    }, 1900)
  }

  const backToCentral = (customMessage) => {
    setMode('central')
    setMessages([])
    setInput('')
    setActiveReader(null)
    setReaderStage('intro')
    setMainQuestionCharged(false)
    setFollowupUsed(false)
    addDelayedMessage(
      'central',
      customMessage || `Hola ${profile?.display_name || 'cielo'}, ya estoy otra vez contigo en central. Dime qué necesitas y te ayudo encantado.`,
      900,
      'Central está escribiendo...'
    )
  }

  const spendMainQuestion = async () => {
    if (!freeQuestionUsed) {
      const { data: auth } = await supabase.auth.getUser()

      await supabase
        .from('profiles')
        .update({ free_question_used: true })
        .eq('auth_user_id', auth.user.id)

      setFreeQuestionUsed(true)
      return true
    }

    if (credits <= 0) {
      backToCentral(`Cielo, estoy encantada de poder seguir contigo, pero para continuar la consulta necesito que el central te active créditos. En cuanto quieras, te los preparo.`)
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

    const reservedFor = new Date(`${reservationDay}T${reservationTime}:00`).toISOString()

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: profile?.id,
        readerName: reservationReader,
        reservedFor,
        notes: reservationNote,
        email: profile?.email || null,
        displayName: profile?.display_name || null
      })
    })

    const json = await res.json()

    if (!res.ok) {
      alert(json.error || 'No se pudo crear la reserva')
      return
    }

    setReservationMode(false)
    setReservationReader('')
    setReservationDay('')
    setReservationTime('')
    setReservationNote('')

    addDelayedMessage(
      'central',
      `Perfecto cielo 💫 Te he dejado la reserva preparada con ${reservationReader}. ${json.emailSent ? 'Además, te llegará un email de confirmación.' : 'La reserva queda guardada ya mismo en el sistema.'}`,
      1000,
      'Central está escribiendo...'
    )
  }

  const answerPriceQuestion = () => {
    const priceInfo = getPricePackForCountry(profile?.country || country || '')
    addDelayedMessage(
      'central',
      `Claro cielo, ahora mismo para ${profile?.country || 'tu país'} estoy trabajando con estas ofertas: 3 preguntas por ${priceInfo.p3}, 5 preguntas por ${priceInfo.p5} y 10 preguntas por ${priceInfo.p10}. Tú me dices cuál deseas adquirir y te paso a la pasarela de pago.`,
      1200,
      'Central está escribiendo...'
    )
  }

  const answerBestReaderQuestion = () => {
    const available = readers.filter((r) => r.status === 'Libre')
    const best = available[0] || null

    if (!best) {
      addDelayedMessage(
        'central',
        'Ahora mismo las chicas que mejor encajan están ocupadas, cielo, pero si quieres te preparo una reserva para que no te quedes sin tu consulta.',
        1200,
        'Central está escribiendo...'
      )
      return
    }

    addDelayedMessage(
      'central',
      `De las que tengo libres ahora mismo, ${best.name} es de las que más gustan. ${best.intro} Si quieres, te la paso ahora mismo para que aproveches la consulta.`,
      1300,
      'Central está escribiendo...'
    )

    queueTimeout(() => connectToReader(best.name, 'general'), 2100)
  }

  const handleCentralLogic = (text) => {
    const lower = normalizeText(text)

    if (lower.includes('reserva') || lower.includes('reservar') || lower.includes('cita')) {
      setReservationMode(true)
      addDelayedMessage(
        'central',
        'Claro cielo 💫 Yo misma te preparo la reserva. Elige tarotista, día y hora y te la dejo cerrada ahora mismo.',
        1000,
        'Central está escribiendo...'
      )
      return
    }

    if (lower.includes('precio') || lower.includes('credito') || lower.includes('creditos') || lower.includes('créditos') || lower.includes('pagar')) {
      answerPriceQuestion()
      return
    }

    if (
      lower.includes('cual es la mejor') ||
      lower.includes('cual me recomiendas') ||
      lower.includes('cual es la que mas gusta') ||
      lower.includes('cuál es la mejor') ||
      lower.includes('cuál me recomiendas')
    ) {
      answerBestReaderQuestion()
      return
    }

    if (lower.includes('quiero seguir con') || lower.includes('pasame con') || lower.includes('pásame con')) {
      const found = READER_CATALOG.find((reader) => lower.includes(normalizeText(reader.name)))
      if (found) {
        addDelayedMessage(
          'central',
          `Perfecto cielo, te transfiero con ${found.name}. Mucha suerte en tu consulta 💫`,
          900,
          'Central está escribiendo...'
        )
        queueTimeout(() => connectToReader(found.name, currentTopic), 1700)
        return
      }
    }

    const topic = detectTopic(text)
    setCurrentTopic(topic)
    const readerName = findRecommendedReader(topic)
    const reader = READER_CATALOG.find((r) => r.name === readerName)

    let textReply = `Voy a pasarte con ${readerName}, cielo, que siento que puede ayudarte muy bien con esto.`

    if (topic === 'amor') {
      textReply = `Perfecto, te voy a pasar con ${readerName}, que la tengo libre y es experta en temas de amor. Tiene una sensibilidad muy bonita para ver vínculos, regresos y todo lo que todavía se mueve aunque parezca parado. Mucha suerte en tu consulta 💫`
    } else if (topic === 'trabajo') {
      textReply = `Para lo que me estás contando, la energía me lleva a ${readerName}. Suele ver muy rápido bloqueos de trabajo, estabilidad y cambios. Te la paso ahora mismo, cielo.`
    } else if (topic === 'energia') {
      textReply = `Aquí la vibración se me va claramente a ${readerName}. Es muy buena leyendo cargas, caminos y energía sutil. Te la paso ahora mismo, cielo.`
    } else if (topic === 'familia') {
      textReply = `Para temas de familia y emoción contenida, ${readerName} conecta enseguida. Voy a pasarte con ella para que puedas empezar con calma.`
    } else if (topic === 'decision') {
      textReply = `Cuando hay dudas del corazón o decisiones importantes, ${readerName} da mucha claridad. Te la paso ahora mismo para que no pierdas el hilo de lo que sientes.`
    }

    createHumanTypingSequence('central', textReply, 2400, 'Central está escribiendo...')
    queueTimeout(() => connectToReader(readerName, topic), 3000)
  }

  const handleReaderLogic = async (text) => {
    const lower = normalizeText(text)
    const currentReaderName = activeReader || 'la tarotista'
    const currentTargetName = contextMemory.targetName || 'esa persona'
    const userSign = extractZodiac(text)
    const targetName = extractPersonName(text)

    if (userSign && !contextMemory.userSign) {
      setContextMemory((prev) => ({ ...prev, userSign: userSign }))
    }

    if (targetName && !contextMemory.targetName) {
      setContextMemory((prev) => ({ ...prev, targetName }))
    }

    if (readerStage === 'intro') {
      setReaderStage('awaiting-question')
      addDelayedMessage(
        'reader',
        'Claro cielo, dime tu horóscopo para poder entrar mejor en tu energía y explícame un poquito más la pregunta que quieres mirar conmigo.',
        2200,
        `${currentReaderName} está escribiendo...`
      )
      return
    }

    if (readerStage === 'awaiting-question') {
      if (!isRealQuestion(text)) {
        addDelayedMessage(
          'reader',
          'Te sigo leyendo, cielo. Dame un poquito más de detalle para poder ver exactamente qué quieres consultar.',
          1800,
          `${currentReaderName} está escribiendo...`
        )
        return
      }

      const ok = await spendMainQuestion()
      if (!ok) return

      setMainQuestionCharged(true)
      setReaderStage('awaiting-target-sign')

      const personText = targetName ? `sobre ${targetName}` : 'sobre esa persona'
      addDelayedMessage(
        'reader',
        `Vamos a mirarlo, cielo. Ya estoy entrando en lo que me preguntas ${personText}. ¿Sabes el horóscopo de ${targetName || 'esa persona'}?`,
        2600,
        `${currentReaderName} está escribiendo...`
      )
      return
    }

    if (readerStage === 'awaiting-target-sign') {
      const targetSign = extractZodiac(text)

      if (targetSign) {
        setContextMemory((prev) => ({ ...prev, targetSign }))
      }

      setReaderStage('awaiting-card-choice')
      addDelayedMessage(
        'reader',
        'Perfecto cielo, dime ahora un número del 1 al 22 y elige izquierda, derecha o centro.',
        1900,
        `${currentReaderName} está escribiendo...`
      )
      return
    }

    if (readerStage === 'awaiting-card-choice') {
      setReaderStage('answer-given')
      createHumanTypingSequence(
        'reader',
        `Estoy haciendo la tirada, cielo... Dame un instante porque quiero mirarlo bien. Por lo que me sale en esta lectura, ${currentTargetName !== 'esa persona' ? currentTargetName : 'esa persona'} sí tiene intención de volver a acercarse, pero hay factores que todavía pesan mucho: orgullo, miedo a dar el paso y una energía bastante bloqueada. No veo esto cerrado del todo, pero sí veo que hace falta tiempo y movimiento interno.`,
        6500,
        `${currentReaderName} está escribiendo...`
      )
      return
    }

    if (readerStage === 'answer-given') {
      if (!followupUsed && isFollowupQuestion(text)) {
        setFollowupUsed(true)
        addDelayedMessage(
          'reader',
          'No cielo, lo que me marca la energía es que el movimiento viene más desde él que desde ti. Ahora bien, si quieres que profundicemos un poco más y miremos lo que todavía no se ha abierto del todo, necesitarás adquirir créditos.',
          3000,
          `${currentReaderName} está escribiendo...`
        )
        return
      }

      backToCentral(`Hola ${profile?.display_name || 'cielo'}, ¿cómo te fue con ${currentReaderName}? Si quieres seguir con la consulta, te explico los paquetes de créditos y te vuelvo a pasar con ella en cuanto me digas.`)
      return
    }

    backToCentral(`Cielo, para seguir profundizando necesito devolverte con el central y activarte créditos. En cuanto quieras, te lo preparo.`)
  }

  const handleSend = async () => {
    if (!input.trim() || mode === 'connecting') return

    const currentInput = input.trim()
    pushMessage('client', currentInput)
    setInput('')

    if (mode === 'central') {
      handleCentralLogic(currentInput)
      return
    }

    if (mode === 'reader') {
      await handleReaderLogic(currentInput)
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
            <p style={{ color: '#8a6a2f', marginTop: 10 }}>Para poder atenderte, dime tu nombre y el país desde el que me escribes.</p>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4' }}
            />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Tu país"
              style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4' }}
            />
            <button
              onClick={saveProfile}
              style={{ padding: '14px 18px', borderRadius: 14, border: 'none', background: '#6f3ea8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
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
                    {READER_CATALOG.map((reader) => <option key={reader.name} value={reader.name}>{reader.name}</option>)}
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
                <div style={{ textAlign: 'center', color: '#8a6a2f', fontWeight: 700 }}>
                  Conectando con {activeReader}, un momento...
                </div>
              ) : (
                messages.map((message, index) => {
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
                        border: isClient ? 'none' : '1px solid #eadcf8'
                      }}>
                        {!isClient && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#8a6a2f', marginBottom: 6 }}>
                            {isReader ? activeReader?.toUpperCase() : 'CENTRAL'}
                          </div>
                        )}
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                placeholder={mode === 'reader' ? 'Escribe tu consulta...' : 'Escribe aquí tu mensaje...'}
                style={{ flex: 1, padding: '14px 16px', borderRadius: 16, border: '1px solid #dccca4', outline: 'none' }}
              />
              <button
                onClick={handleSend}
                style={{ padding: '14px 18px', borderRadius: 16, border: 'none', background: '#6f3ea8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
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
                {freeQuestionUsed ? 'La consulta gratis ya está usada' : 'Incluye tu primera consulta gratuita'}
              </div>
            </div>

            <a href="/payment" style={{
              display: 'block',
              textAlign: 'center',
              width: '100%',
              padding: '14px 16px',
              borderRadius: 14,
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
                if (mode !== 'central') {
                  backToCentral('Perfecto cielo 💫 te llevo con el central para dejarte la reserva preparada.')
                }
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

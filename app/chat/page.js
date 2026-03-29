'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  READERS,
  topicFromText,
  recommendedReader,
  pricesForCountry,
  extractName,
  extractZodiac,
  isMainQuestion,
  isFollowup,
  estimateTypingMs,
  normalizeText
} from '../../lib/chatShared'

const CENTRAL_NAME = 'Clara'

function readerGreeting(name) {
  const reader = READERS.find((r) => r.name === name)
  return reader
    ? `Hola cielo, soy ${name} de Tarot Celestial. ${reader.description} Estoy contigo, cuéntame con calma en qué te puedo ayudar hoy.`
    : `Hola cielo, soy ${name} de Tarot Celestial. Estoy contigo, cuéntame con calma en qué te puedo ayudar hoy.`
}

export default function ChatPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [credits, setCredits] = useState(0)
  const [freeQuestionUsed, setFreeQuestionUsed] = useState(false)
  const [activeReader, setActiveReader] = useState(null)
  const [readers, setReaders] = useState([])
  const [mode, setMode] = useState('central')
  const [typing, setTyping] = useState('')
  const [reservationMode, setReservationMode] = useState(false)
  const [reservationReader, setReservationReader] = useState('')
  const [reservationDay, setReservationDay] = useState('')
  const [reservationTime, setReservationTime] = useState('')
  const [reservationNote, setReservationNote] = useState('')
  const [pendingTransfer, setPendingTransfer] = useState(null)
  const [memory, setMemory] = useState({
    topic: '',
    targetName: '',
    userSign: '',
    targetSign: '',
    readerStage: 'intro'
  })
  const [knownMessageIds, setKnownMessageIds] = useState({})
  const scrollRef = useRef(null)
  const shouldStickRef = useRef(true)
  const timersRef = useRef([])

  const onlineReaders = useMemo(() => readers.filter((r) => r.status !== 'Offline'), [readers])
  const offlineReaders = useMemo(() => readers.filter((r) => r.status === 'Offline'), [readers])

  const queue = (fn, delay) => {
    const id = setTimeout(fn, delay)
    timersRef.current.push(id)
  }

  const addLocalMessage = (message) => {
    setMessages((prev) => [...prev, message])
  }

  const persistMessage = async (sender, text, senderName = null) => {
    if (!session?.id) return null
    const res = await fetch('/api/session/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, sender, text, senderName })
    })
    const json = await res.json()
    return json.message || null
  }

  const addAndPersist = async (sender, text, senderName = null) => {
    const temp = { id: `temp-${Math.random()}`, sender, sender_name: senderName, text }
    addLocalMessage(temp)
    const saved = await persistMessage(sender, text, senderName)
    if (saved) {
      setKnownMessageIds((prev) => ({ ...prev, [saved.id]: true }))
    }
  }

  const showTypingAndAnswer = async (sender, senderName, text, minDelay = 1500) => {
    const label = sender === 'reader'
      ? `${senderName || activeReader || 'Tarotista'} está escribiendo...`
      : `${senderName || CENTRAL_NAME} está escribiendo...`

    setTyping(label)
    const total = estimateTypingMs(text, minDelay, 34, minDelay, 10000)

    queue(() => setTyping(''), Math.floor(total * 0.45))
    queue(() => setTyping(label), Math.floor(total * 0.62))
    queue(async () => {
      setTyping('')
      await addAndPersist(sender, text, senderName)
    }, total)
  }

  const fetchReaders = async () => {
    const res = await fetch('/api/readers/list')
    const json = await res.json()
    setReaders(json.readers || [])
    return json.readers || []
  }

  const fetchMessages = async (sessionId) => {
    const res = await fetch(`/api/session/messages?sessionId=${sessionId}`)
    const json = await res.json()
    const incoming = json.messages || []

    setMessages((prev) => {
      const prevIds = new Set(prev.map((m) => m.id).filter(Boolean))
      const merged = [...prev]
      incoming.forEach((m) => {
        if (!prevIds.has(m.id)) {
          merged.push(m)
        }
      })
      return merged
    })

    setKnownMessageIds((prev) => {
      const next = { ...prev }
      incoming.forEach((m) => { next[m.id] = true })
      return next
    })
  }

  const heartbeat = async (currentMode, currentReaderName) => {
    if (!session?.id) return
    await fetch('/api/session/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        mode: currentMode,
        currentReaderName: currentReaderName || null
      })
    })
  }

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
        alert('Falta perfil. Regístrate de nuevo.')
        window.location.href = '/auth/register'
        return
      }

      setProfile(profileData)
      setCredits(profileData.credits || 0)
      setFreeQuestionUsed(profileData.free_question_used || false)

      const sessionRes = await fetch('/api/session/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profileData.id })
      })
      const sessionJson = await sessionRes.json()
      setSession(sessionJson.session)

      await fetchReaders()
      await fetchMessages(sessionJson.session.id)

      if (sessionJson.session && (!messages.length)) {
        const welcome = `Hola ${profileData.display_name}, bienvenida de nuevo a Tarot Celestial. Soy ${CENTRAL_NAME}, del central. ¿En qué te puedo ayudar hoy, cielo?`
        await addAndPersist('central', welcome, CENTRAL_NAME)
      }

      if (typeof window !== 'undefined' && window.localStorage.getItem('tc_payment_success') === '1') {
        window.localStorage.removeItem('tc_payment_success')
        queue(async () => {
          await addAndPersist('central', `Perfecto ${profileData.display_name}, veo que ya has realizado el pago y ya tienes los créditos asignados. ¿Deseas seguir hablando con ${window.localStorage.getItem('tc_last_reader') || 'tu tarotista'} o prefieres probar a otra de nuestras chicas?`, CENTRAL_NAME)
        }, 900)
      }

      setLoading(false)
    }

    if (supabase) init()
    return () => timersRef.current.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (!session?.id) return
    const messagesPoll = setInterval(() => fetchMessages(session.id), 3500)
    const readersPoll = setInterval(fetchReaders, 6000)
    const beat = setInterval(() => heartbeat(mode, activeReader), 15000)
    return () => {
      clearInterval(messagesPoll)
      clearInterval(readersPoll)
      clearInterval(beat)
    }
  }, [session?.id, mode, activeReader])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (shouldStickRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, typing])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldStickRef.current = distance < 80
  }

  const askAI = async (role, latestUserMessage, availableReadersList = []) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          profileName: profile?.display_name || '',
          country: profile?.country || '',
          conversation: messages.slice(-12).map((m) => ({ sender: m.sender || m.sender_name || 'system', text: m.text })),
          latestUserMessage,
          availableReaders: availableReadersList,
          memory: {
            ...memory,
            readerName: activeReader,
            credits,
            freeQuestionUsed
          }
        })
      })
      const json = await res.json()
      if (!res.ok) return null
      return json.text || null
    } catch {
      return null
    }
  }

  const chargeMainQuestion = async () => {
    if (!freeQuestionUsed) {
      await supabase.from('profiles').update({ free_question_used: true }).eq('id', profile.id)
      setFreeQuestionUsed(true)
      return true
    }

    if (credits <= 0) return false

    const newCredits = Math.max(credits - 1, 0)
    await supabase.from('profiles').update({ credits: newCredits }).eq('id', profile.id)
    setCredits(newCredits)
    return true
  }

  const beginTransfer = async (readerName) => {
    await addAndPersist('central', `Vale cielo, te transfiero con ${readerName}. Un momento...`, CENTRAL_NAME)

    queue(() => {
      setMode('connecting')
      setTyping('')
    }, 3000)

    const randomDelay = 6000 + Math.floor(Math.random() * 14000)

    queue(async () => {
      const res = await fetch('/api/readers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readerName,
          profileId: profile.id,
          sessionId: session.id
        })
      })
      const json = await res.json()

      if (!res.ok) {
        setMode('central')
        await addAndPersist('central', `Cielo, justo ahora ${readerName} ha pasado a estar ocupada. Si quieres te recomiendo a otra de las que tengo libres en este momento.`, CENTRAL_NAME)
        await fetchReaders()
        return
      }

      setActiveReader(readerName)
      setMode('reader')
      setPendingTransfer(null)
      setMemory((prev) => ({ ...prev, readerStage: 'intro' }))
      await fetchReaders()
      await addAndPersist('reader', readerGreeting(readerName), readerName)
    }, 3000 + randomDelay)
  }

  const releaseReader = async () => {
    if (!activeReader) return
    await fetch('/api/readers/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readerName: activeReader })
    })
    await fetchReaders()
  }

  const answerCentral = async (text) => {
    const lower = normalizeText(text)

    if (pendingTransfer) {
      if (['si', 'sí', 'vale', 'ok', 'perfecto', 'claro', 'de acuerdo'].includes(lower)) {
        await beginTransfer(pendingTransfer)
        return
      }
      if (['no', 'mejor no', 'espera'].includes(lower)) {
        setPendingTransfer(null)
        await showTypingAndAnswer('central', CENTRAL_NAME, 'Claro cielo, no pasa nada. Dime qué prefieres y lo vemos juntas.', 1200)
        return
      }
    }

    if (lower.includes('precio') || lower.includes('credit') || lower.includes('pagar')) {
      const p = pricesForCountry(profile?.country || '')
      await showTypingAndAnswer('central', CENTRAL_NAME, `Claro cielo, ahora mismo tienes 3 preguntas por ${p.p3}, 5 preguntas por ${p.p5} y 10 preguntas por ${p.p10}. Tú me dices cuál deseas adquirir y te paso el enlace de pago.`, 1400)
      return
    }

    if (lower.includes('reserv') || lower.includes('cita')) {
      setReservationMode(true)
      await showTypingAndAnswer('central', CENTRAL_NAME, 'Claro cielo, te preparo la reserva. Elige tarotista, día y hora y yo me encargo de dejártela cerrada.', 1300)
      return
    }

    if (
      lower.includes('cual es la mejor') ||
      lower.includes('cuál es la mejor') ||
      lower.includes('cual es la que mas gusta') ||
      lower.includes('cuál es la que más gusta') ||
      lower.includes('cual me recomiendas') ||
      lower.includes('cuál me recomiendas')
    ) {
      const available = readers.filter((r) => r.status === 'Libre')
      const ai = await askAI('central', text, available)
      await showTypingAndAnswer('central', CENTRAL_NAME, ai || `De las que tengo libres ahora mismo, ${available[0]?.name || 'Aurora'} es de las que más gustan. Si quieres, te paso con ella.`, 1600)
      return
    }

    const topic = topicFromText(text)
    const available = readers.filter((r) => r.status === 'Libre')
    const suggested = recommendedReader(topic, available)
    setMemory((prev) => ({ ...prev, topic }))

    let reply = await askAI('central', text, available)
    if (!reply) {
      const reader = available.find((r) => r.name === suggested) || available[0]
      reply = `Por lo que me estás contando, cielo, siento que te iría muy bien hablar con ${reader?.name || 'Aurora'}, porque ${reader?.description || 'conecta muy bien con este tema'}. Si quieres, te paso con ${reader?.name || 'ella'} ahora mismo.`
    }

    setPendingTransfer(suggested)
    await showTypingAndAnswer('central', CENTRAL_NAME, reply, 1700)
  }

  const answerReader = async (text) => {
    const lower = normalizeText(text)
    const stage = memory.readerStage || 'intro'
    const z = extractZodiac(text)
    const personName = extractName(text)

    if (z) {
      if (!memory.userSign) {
        setMemory((prev) => ({ ...prev, userSign: z }))
      } else if (!memory.targetSign) {
        setMemory((prev) => ({ ...prev, targetSign: z }))
      }
    }
    if (personName && !memory.targetName) {
      setMemory((prev) => ({ ...prev, targetName: personName }))
    }

    if (stage === 'intro') {
      setMemory((prev) => ({ ...prev, readerStage: 'awaiting-main' }))
      const ai = await askAI('reader', text)
      await showTypingAndAnswer('reader', activeReader, ai || 'Claro cielo, dime tu horóscopo para que pueda entrar mejor en tu energía y explícame un poquito más la pregunta que quieres mirar conmigo.', 2200)
      return
    }

    if (stage === 'awaiting-main') {
      if (!isMainQuestion(text)) {
        await showTypingAndAnswer('reader', activeReader, 'Te sigo leyendo, cielo. Dame un poquito más de detalle para poder ver exactamente lo que quieres consultar.', 1800)
        return
      }

      const allowed = await chargeMainQuestion()
      if (!allowed) {
        await releaseReader()
        setMode('central')
        setActiveReader(null)
        await showTypingAndAnswer('central', CENTRAL_NAME, 'Cielo, para seguir con la consulta necesito activarte créditos. Si quieres, te explico ahora mismo los paquetes y te vuelvo a pasar con tu tarotista.', 1500)
        return
      }

      setMemory((prev) => ({ ...prev, readerStage: 'awaiting-target-sign' }))
      const ai = await askAI('reader', text)
      await showTypingAndAnswer('reader', activeReader, ai || `Vamos a mirarlo, cielo. ¿Sabes el horóscopo de ${memory.targetName || 'esa persona'}?`, 2600)
      return
    }

    if (stage === 'awaiting-target-sign') {
      setMemory((prev) => ({ ...prev, readerStage: 'awaiting-card' }))
      await showTypingAndAnswer('reader', activeReader, 'Perfecto cielo, dime ahora un número del 1 al 22 y elige izquierda, derecha o centro.', 1900)
      return
    }

    if (stage === 'awaiting-card') {
      setMemory((prev) => ({ ...prev, readerStage: 'answer-given' }))
      const ai = await askAI('reader', text)
      await showTypingAndAnswer('reader', activeReader, ai || `Estoy haciendo la tirada, cielo... Dame un instante. Por lo que veo, ${memory.targetName || 'esa persona'} sí quiere volver, pero hay orgullo, bloqueo y una energía que todavía no termina de moverse como debería. No veo esto cerrado del todo.`, 5200)
      return
    }

    if (stage === 'answer-given') {
      if (isFollowup(text)) {
        setMemory((prev) => ({ ...prev, readerStage: 'followup-used' }))
        const ai = await askAI('reader', text)
        await showTypingAndAnswer('reader', activeReader, ai || 'No cielo, lo que me marca la energía es que el movimiento viene más desde él que desde ti. Pero si quieres que profundicemos un poco más, ya necesitaríamos créditos para seguir con la consulta.', 3200)
        return
      }

      await releaseReader()
      setMode('central')
      setActiveReader(null)
      await showTypingAndAnswer('central', CENTRAL_NAME, `Hola ${profile.display_name}, ¿cómo te fue con ${memory.lastReader || 'tu tarotista'}? Si quieres seguir con la consulta, te explico los créditos y te la vuelvo a pasar.`, 1300)
      return
    }

    if (stage === 'followup-used') {
      await releaseReader()
      setMode('central')
      setActiveReader(null)
      await showTypingAndAnswer('central', CENTRAL_NAME, `Cielo, si quieres seguir profundizando con ${memory.lastReader || 'tu tarotista'}, te activo créditos y te la vuelvo a pasar en cuanto me digas.`, 1400)
      return
    }
  }

  const submitReservation = async () => {
    if (!reservationReader || !reservationDay || !reservationTime) {
      alert('Selecciona tarotista, día y hora')
      return
    }

    const reservedFor = new Date(`${reservationDay}T${reservationTime}:00`).toISOString()

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: profile.id,
        readerName: reservationReader,
        reservedFor,
        notes: reservationNote,
        email: profile.email || '',
        displayName: profile.display_name || ''
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
    await showTypingAndAnswer('central', CENTRAL_NAME, `Perfecto cielo, te he dejado la reserva confirmada con ${reservationReader}. ${json.emailSent ? 'Además te llegará un email automático de confirmación.' : 'La reserva ya queda guardada en el sistema.'}`, 1300)
  }

  const handleSend = async () => {
    if (!input.trim() || mode === 'connecting') return
    const text = input.trim()
    await addAndPersist('client', text, profile?.display_name || 'Clienta')
    setInput('')

    if (mode === 'central') {
      await answerCentral(text)
      return
    }

    if (mode === 'reader') {
      await answerReader(text)
      return
    }
  }

  const handleLogout = async () => {
    if (activeReader) {
      await releaseReader()
    }
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
                  onClick={async () => {
                    if (reader.status !== 'Libre') return
                    setPendingTransfer(reader.name)
                    await showTypingAndAnswer('central', CENTRAL_NAME, `Mira cielo, ahora mismo tengo libre a ${reader.name}, que ${reader.description}. Si quieres, te paso con ${reader.name}.`, 1400)
                  }}
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
                {mode === 'reader' ? activeReader : mode === 'connecting' ? `Conectando con ${activeReader}...` : `${CENTRAL_NAME} · Central Tarot Celestial`}
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
                    {READERS.map((reader) => <option key={reader.name} value={reader.name}>{reader.name}</option>)}
                  </select>
                  <input type="date" value={reservationDay} onChange={(e) => setReservationDay(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid #dccca4' }} />
                  <input type="time" value={reservationTime} onChange={(e) => setReservationTime(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid #dccca4' }} />
                </div>
                <textarea value={reservationNote} onChange={(e) => setReservationNote(e.target.value)} placeholder="Notas opcionales para la reserva" style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 12, border: '1px solid #dccca4', boxSizing: 'border-box', marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={submitReservation} style={{ padding: '12px 16px', borderRadius: 12, border: 'none', background: '#6f3ea8', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Confirmar reserva</button>
                  <button onClick={() => setReservationMode(false)} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid #dccca4', background: '#fff', color: '#6f3ea8', fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            )}

            <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, minHeight: 0, padding: 18, overflowY: 'auto', display: 'grid', gap: 10 }}>
              {mode === 'connecting' ? (
                <div style={{ textAlign: 'center', color: '#8a6a2f', fontWeight: 700, marginTop: 10 }}>
                  Conectando con {activeReader}, un momento...
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isClient = m.sender === 'client'
                  const senderLabel = isClient ? '' : m.sender_name || (m.sender === 'central' ? CENTRAL_NAME : activeReader || 'Tarotista')
                  return (
                    <div key={m.id || idx} style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '66%',
                        padding: '12px 14px',
                        borderRadius: 16,
                        background: isClient ? '#6f3ea8' : '#faf6ff',
                        color: isClient ? '#fff' : '#4b2a67',
                        border: isClient ? 'none' : '1px solid #eadcf8'
                      }}>
                        {!isClient && <div style={{ fontSize: 11, fontWeight: 700, color: '#8a6a2f', marginBottom: 5 }}>{String(senderLabel).toUpperCase()}</div>}
                        <div style={{ lineHeight: 1.5, fontSize: 15 }}>{m.text}</div>
                      </div>
                    </div>
                  )
                })
              )}

              {!!typing && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#faf6ff', border: '1px solid #eadcf8', borderRadius: 16, padding: '10px 14px', color: '#7a6690' }}>
                    {typing}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 18, borderTop: '1px solid #f1e7cd', display: 'flex', gap: 12, flexShrink: 0 }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={mode === 'reader' ? 'Escribe tu consulta...' : 'Escribe aquí tu mensaje...'} style={{ flex: 1, padding: '14px 16px', borderRadius: 16, border: '1px solid #dccca4', outline: 'none' }} />
              <button onClick={handleSend} style={{ padding: '14px 18px', borderRadius: 16, border: 'none', background: '#6f3ea8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Enviar</button>
            </div>
          </section>

          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', overflowY: 'auto' }}>
            <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Tus créditos</h3>
            <div style={{ padding: 16, borderRadius: 16, background: '#fffaf1', border: '1px solid #f0dfb2', marginBottom: 14 }}>
              <div style={{ color: '#8a6a2f', fontSize: 13 }}>Saldo actual</div>
              <div style={{ color: '#5b2c83', fontSize: 30, fontWeight: 800, marginTop: 4 }}>{credits}</div>
              <div style={{ color: '#8c7a58', fontSize: 13 }}>{freeQuestionUsed ? 'La consulta gratis ya está usada' : 'Incluye tu primera consulta gratuita'}</div>
            </div>

            <a href="/payment" style={{ display: 'block', textAlign: 'center', width: '100%', padding: '14px 16px', borderRadius: 14, background: '#d6ad45', color: '#fff', fontWeight: 800, cursor: 'pointer', marginBottom: 10, textDecoration: 'none', boxSizing: 'border-box' }}>
              Comprar créditos
            </a>

            <button onClick={async () => {
              if (activeReader) await releaseReader()
              setActiveReader(null)
              setMode('central')
              await addAndPersist('central', `Hola ${profile.display_name}, ya estoy otra vez contigo. Dime qué necesitas y te ayudo encantada.`, CENTRAL_NAME)
            }} style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4', background: '#fff', color: '#6f3ea8', fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>
              Volver con el central
            </button>

            <button onClick={() => setReservationMode(true)} style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4', background: '#fff', color: '#6f3ea8', fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>
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

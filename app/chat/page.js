'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const ALL_READERS = [
  { name: 'Aurora', specialty: 'Amor y reconciliaciones', turn: 'morning', sales: 'de las más queridas para amor, retornos y bloqueos sentimentales', greeting: 'Hola cielo, soy Aurora de Tarot Celestial. Estoy contigo para mirar tu situación con calma y profundidad.' },
  { name: 'María', specialty: 'Trabajo y estabilidad', turn: 'morning', sales: 'conecta muy rápido con temas de trabajo y decisiones importantes', greeting: 'Hola corazón, soy María. Cuéntame despacito qué te preocupa y voy mirando tu energía.' },
  { name: 'Luna', specialty: 'Energía y caminos', turn: 'morning', sales: 'muy buena en energía, caminos abiertos y dudas espirituales', greeting: 'Hola cielo, soy Luna. Vamos a mirar los caminos que tienes abiertos ahora mismo.' },
  { name: 'Sara', specialty: 'Decisiones sentimentales', turn: 'morning', sales: 'da mucha claridad cuando hay dudas del corazón', greeting: 'Hola bonita, soy Sara. Estoy aquí contigo para ayudarte a ver esto claro.' },
  { name: 'Candela', specialty: 'Rupturas y regresos', turn: 'afternoon', sales: 'muy fuerte en reconciliaciones y terceras personas', greeting: 'Hola cielo, soy Candela. Vamos a mirar despacito lo que está pasando en tu vida sentimental.' },
  { name: 'Noa', specialty: 'Destino y crecimiento', turn: 'afternoon', sales: 'te orienta muy bien en cambios de ciclo y crecimiento personal', greeting: 'Hola corazón, soy Noa. Cuéntame lo que te inquieta y lo vemos con calma.' },
  { name: 'Violeta', specialty: 'Alma gemela', turn: 'afternoon', sales: 'es de las más buscadas para vínculos profundos y alma gemela', greeting: 'Hola cielo, soy Violeta. Estoy contigo para mirar lo que te une a esa persona.' },
  { name: 'Rocío', specialty: 'Celos e infidelidad', turn: 'afternoon', sales: 'muy clara en celos, engaños y relaciones inestables', greeting: 'Hola bonita, soy Rocío. Vamos a mirar la verdad de esta situación.' },
  { name: 'Alma', specialty: 'Espiritualidad', turn: 'night', sales: 'muy intuitiva en temas espirituales y energía profunda', greeting: 'Hola cielo, soy Alma. Respira y cuéntame despacito qué necesitas mirar hoy.' },
  { name: 'Nerea', specialty: 'Respuestas rápidas', turn: 'night', sales: 'muy directa para preguntas concretas y urgentes', greeting: 'Hola corazón, soy Nerea. Dime tu consulta y voy directa al punto.' },
  { name: 'Mara', specialty: 'Medium', turn: 'night', sales: 'muy especial para conexión espiritual y mensajes profundos', greeting: 'Hola cielo, soy Mara. Voy a acompañarte para mirar esto con profundidad.' },
  { name: 'Estela', specialty: 'Dinero y prosperidad', turn: 'night', sales: 'muy fuerte en economía, prosperidad y bloqueos materiales', greeting: 'Hola bonita, soy Estela. Cuéntame qué te preocupa y lo vemos con claridad.' }
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
  const [reservationMode, setReservationMode] = useState(false)
  const [reservationReader, setReservationReader] = useState('')
  const [reservationDay, setReservationDay] = useState('')
  const [reservationTime, setReservationTime] = useState('')
  const [reservationNote, setReservationNote] = useState('')
  const messagesRef = useRef(null)
  const timeoutRef = useRef([])

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
        addCentralDelayed(`Hola ${profileData.display_name}, bienvenida de nuevo a Tarot Celestial 💫 Cuéntame con calma qué te preocupa ahora mismo y te ayudaré a elegir a la mejor tarotista.`)
      }

      setLoading(false)
    }

    init()
    return () => timeoutRef.current.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const queueTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay)
    timeoutRef.current.push(id)
  }

  const pushMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }])
  }

  const addCentralDelayed = (text, delay = 1200) => {
    setIsTyping(true)
    queueTimeout(() => {
      pushMessage('central', text)
      setIsTyping(false)
    }, delay)
  }

  const addReaderDelayed = (text, delay = 2200) => {
    setIsTyping(true)
    queueTimeout(() => {
      pushMessage('reader', text)
      setIsTyping(false)
    }, delay)
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
    addCentralDelayed(`Perfecto ${name.trim()}, como es tu primera vez en Tarot Celestial tienes una consulta gratis. Cuéntame el tema y te paso con la mejor tarotista.`)
  }

  const connectToReader = (readerName, topic = 'general') => {
    const reader = ALL_READERS.find((item) => item.name === readerName)
    if (!reader) return

    setMode('connecting')
    setActiveReader(readerName)

    queueTimeout(() => {
      setMode('reader')
      setMessages([{ sender: 'reader', text: reader.greeting }])
    }, 1600)
  }

  const backToCentral = (customMessage) => {
    setMode('central')
    setActiveReader(null)
    setMessages([])
    setInput('')
    addCentralDelayed(
      customMessage || `Ya estoy contigo otra vez, cielo 💫 Dime si quieres seguir con tu consulta, activar créditos o hacer una reserva.`
    )
  }

  const spendCreditIfNeeded = async () => {
    if (!freeQuestionUsed) {
      setFreeQuestionUsed(true)
      return true
    }

    if (credits <= 0) {
      addCentralDelayed('Cielo, para continuar necesito activarte créditos. Puedes comprarlos ahora mismo y seguimos justo donde lo dejamos 💫', 1000)
      setMode('central')
      setActiveReader(null)
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

    addCentralDelayed(`Perfecto cielo 💫 te he dejado la reserva con ${reservationReader}. En esta versión queda guardada en base de datos. El email automático queda preparado para el siguiente bloque.`)
  }

  const handleCentralLogic = (text) => {
    const lower = normalizeText(text)

    if (lower.includes('reserv')) {
      setReservationMode(true)
      addCentralDelayed('Claro cielo 💫 te preparo la reserva. Elige tarotista, día y hora y te la dejo anotada.')
      return
    }

    if (lower.includes('precio') || lower.includes('credit') || lower.includes('pagar') || lower.includes('comprar')) {
      addCentralDelayed('Ahora mismo tienes 3 preguntas por 3€, 5 preguntas por 4,50€ y 10 preguntas por 7€. Si quieres, desde la derecha puedes ir directa a comprar créditos 💫')
      return
    }

    if (lower.includes('amor') || lower.includes('ex') || lower.includes('pareja') || lower.includes('volver') || lower.includes('relacion')) {
      addCentralDelayed('Mira cielo, justo ahora tengo a Aurora libre y es de las mejores para amor, reconciliaciones y bloqueos sentimentales. Si quieres, te la paso ahora mismo para que aproveches tu consulta gratuita 💫')
      queueTimeout(() => connectToReader('Aurora', 'amor'), 1700)
      return
    }

    if (lower.includes('trabajo') || lower.includes('dinero') || lower.includes('econom')) {
      addCentralDelayed('Para trabajo y estabilidad, María conecta muy rápido con este tipo de consultas. Si quieres, te la paso ahora mismo.')
      queueTimeout(() => connectToReader('María', 'trabajo'), 1700)
      return
    }

    if (lower.includes('energia') || lower.includes('espiritual') || lower.includes('camino')) {
      addCentralDelayed('Para energía y caminos abiertos, Luna va muy bien. Si quieres, te la paso ahora mismo.')
      queueTimeout(() => connectToReader('Luna', 'energia'), 1700)
      return
    }

    if (lower.includes('duda') || lower.includes('decision') || lower.includes('decisión')) {
      addCentralDelayed('Si estás entre dudas y decisiones, Sara suele dar muchísima claridad. Si te parece bien, te la paso ahora mismo.')
      queueTimeout(() => connectToReader('Sara', 'decision'), 1700)
      return
    }

    addCentralDelayed('Cuéntame con calma cielo, qué es lo que más te preocupa ahora mismo. Si me dices si es amor, trabajo, dinero, energía o dudas del corazón, te paso con la tarotista ideal 💫')
  }

  const handleReaderLogic = async (text) => {
    const allowed = await spendCreditIfNeeded()
    if (!allowed) return

    const readerName = activeReader || 'tu tarotista'
    const lower = normalizeText(text)

    if (lower.includes('volver') || lower.includes('central')) {
      backToCentral(`Ya estoy otra vez contigo cielo 💫 ${readerName} me dice que podéis seguir cuando quieras.`)
      return
    }

    addReaderDelayed(`Estoy mirando tu consulta, cielo. ${readerName} sigue conectando con tu energía para profundizar un poco más ✨`)
  }

  const handleSend = async () => {
    if (!input.trim()) return

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
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)', padding: 20, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1380, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr) 280px', gap: 18 }}>
          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc' }}>
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

          <section style={{ background: '#fff', borderRadius: 22, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', display: 'flex', flexDirection: 'column', minHeight: '78vh' }}>
            <div style={{ padding: 18, borderBottom: '1px solid #f1e7cd' }}>
              <div style={{ color: '#5b2c83', fontWeight: 800, fontSize: 20 }}>
                {mode === 'reader' ? activeReader : mode === 'connecting' ? `Conectando con ${activeReader}...` : 'Central Tarot Celestial'}
              </div>
              <div style={{ color: '#8a6a2f', fontSize: 14 }}>
                {profile?.display_name ? `Atendiendo a ${profile.display_name}${profile.country ? ` · ${profile.country}` : ''}` : 'Atención personalizada'}
              </div>
            </div>

            {reservationMode && (
              <div style={{ padding: 18, borderBottom: '1px solid #f1e7cd', background: '#fffaf1' }}>
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

            <div ref={messagesRef} style={{ flex: 1, padding: 18, overflowY: 'auto', display: 'grid', gap: 12 }}>
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
                        <div style={{ lineHeight: 1.5 }}>{message.text}</div>
                      </div>
                    </div>
                  )
                })
              )}

              {isTyping && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#faf6ff', border: '1px solid #eadcf8', borderRadius: 18, padding: '12px 16px', color: '#7a6690' }}>
                    {mode === 'reader' ? `${activeReader} está escribiendo...` : 'Central está escribiendo...'}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 18, borderTop: '1px solid #f1e7cd', display: 'flex', gap: 12 }}>
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

          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc' }}>
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
                if (mode !== 'central') backToCentral('Perfecto cielo 💫 te llevo al central para que te deje la reserva preparada.')
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

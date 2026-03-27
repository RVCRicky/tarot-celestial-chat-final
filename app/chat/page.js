'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const ONLINE_READERS = [
  { name: 'Aurora', specialty: 'Amor y reconciliaciones', status: 'Libre' },
  { name: 'María', specialty: 'Videncia natural', status: 'Libre' },
  { name: 'Luna', specialty: 'Energía y caminos', status: 'Ocupada' },
  { name: 'Sara', specialty: 'Decisiones sentimentales', status: 'Libre' }
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

export default function ChatPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [step, setStep] = useState('loading')
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState([])
  const [hasAskedTopic, setHasAskedTopic] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        window.location.href = '/auth/login'
        return
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle()

      if (error) {
        console.error(error)
      }

      if (!profileData) {
        setStep('askData')
      } else {
        setProfile(profileData)
        setStep('chat')
        addDelayedCentralMessage(
          `Hola ${profileData.display_name}, bienvenida de nuevo a Tarot Celestial. Estoy aquí contigo, cielo. ¿Sobre qué tema te gustaría consultar hoy?`
        )
        setHasAskedTopic(true)
      }

      setLoading(false)
    }

    init()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const addDelayedCentralMessage = (text, delay = 1500) => {
    setIsTyping(true)
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: 'central', text }])
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
      `Perfecto ${name.trim()}, como es tu primera vez en Tarot Celestial tienes una consulta gratis. Dime sobre qué tema quieres consultar y te recomendaré a la tarotista ideal.`
    )
    setHasAskedTopic(true)
  }

  const handleSend = () => {
    if (!input.trim()) return

    const currentInput = input.trim()
    setMessages((prev) => [...prev, { sender: 'client', text: currentInput }])
    setInput('')

    if (!hasAskedTopic) {
      addDelayedCentralMessage(
        `Cuéntame cielo, ¿qué deseas consultar hoy? Amor, trabajo, familia o energía.`
      )
      setHasAskedTopic(true)
      return
    }

    const lower = currentInput.toLowerCase()

    if (lower.includes('amor') || lower.includes('pareja') || lower.includes('volver') || lower.includes('ex')) {
      addDelayedCentralMessage(
        'De las chicas que tengo libres ahora mismo, Aurora es de las más queridas para temas de amor y reconciliaciones. Si te parece bien, te la recomiendo para empezar con tu consulta gratis.',
        2200
      )
      return
    }

    if (lower.includes('trabajo') || lower.includes('dinero')) {
      addDelayedCentralMessage(
        'Para trabajo y estabilidad económica te recomendaría a Estela, que suele ser muy certera en ese tipo de consultas. Ahora mismo no la tengo conectada, pero puedo ofrecerte otra opción o tomarte una reserva.',
        2200
      )
      return
    }

    if (lower.includes('precio') || lower.includes('creditos') || lower.includes('créditos')) {
      const userCountry = profile?.country || country || 'tu país'
      addDelayedCentralMessage(
        `Claro cielo. Ahora mismo para ${userCountry} estoy trabajando con estas ofertas: 3 preguntas por 3€, 5 preguntas por 4,50€ y 10 preguntas por 7€. Cuando activemos Stripe te lo dejaré ya automático dentro del chat.`,
        1800
      )
      return
    }

    addDelayedCentralMessage(
      'Te estoy leyendo, cielo. Si me dices si tu consulta es sobre amor, trabajo, familia o energía, te recomiendo a la mejor tarotista que tenga disponible ahora mismo.',
      1700
    )
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

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)', padding: 20 }}>
      <div style={{ maxWidth: 1380, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 280px', gap: 18 }}>
          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc' }}>
            <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Tarotistas en línea</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {ONLINE_READERS.map((reader) => (
                <div key={reader.name} style={{ padding: 12, borderRadius: 14, background: '#faf7ff', border: '1px solid #ece1ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ color: '#4a2468' }}>{reader.name}</strong>
                    <span style={{ color: reader.status === 'Libre' ? '#1f8b4c' : '#c17a00', fontSize: 12, fontWeight: 700 }}>
                      {reader.status}
                    </span>
                  </div>
                  <div style={{ color: '#7a6690', fontSize: 13, marginTop: 4 }}>{reader.specialty}</div>
                </div>
              ))}
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

          <section style={{ background: '#fff', borderRadius: 22, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', display: 'flex', flexDirection: 'column', minHeight: '78vh' }}>
            <div style={{ padding: 18, borderBottom: '1px solid #f1e7cd' }}>
              <div style={{ color: '#5b2c83', fontWeight: 800, fontSize: 20 }}>Central Tarot Celestial</div>
              <div style={{ color: '#8a6a2f', fontSize: 14 }}>
                {profile?.display_name ? `Atendiendo a ${profile.display_name}${profile.country ? ` · ${profile.country}` : ''}` : 'Atención personalizada'}
              </div>
            </div>

            <div style={{ flex: 1, padding: 18, overflowY: 'auto', display: 'grid', gap: 12 }}>
              {messages.map((message, index) => {
                const isClient = message.sender === 'client'
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
                      {!isClient && <div style={{ fontSize: 12, fontWeight: 700, color: '#8a6a2f', marginBottom: 6 }}>CENTRAL</div>}
                      <div style={{ lineHeight: 1.5 }}>{message.text}</div>
                    </div>
                  </div>
                )
              })}

              {isTyping && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#faf6ff', border: '1px solid #eadcf8', borderRadius: 18, padding: '12px 16px', color: '#7a6690' }}>
                    Central está escribiendo...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: 18, borderTop: '1px solid #f1e7cd', display: 'flex', gap: 12 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend()
                }}
                placeholder="Escribe aquí tu mensaje..."
                style={{ flex: 1, padding: '14px 16px', borderRadius: 16, border: '1px solid #dccca4', outline: 'none' }}
              />
              <button
                onClick={handleSend}
                style={{ padding: '14px 18px', borderRadius: 16, border: 'none', background: '#6f3ea8', color: 'white', fontWeight: 700, cursor: 'pointer' }}
              >
                Enviar
              </button>
            </div>
          </section>

          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc' }}>
            <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Tus créditos</h3>
            <div style={{ padding: 16, borderRadius: 16, background: '#fffaf1', border: '1px solid #f0dfb2', marginBottom: 14 }}>
              <div style={{ color: '#8a6a2f', fontSize: 13 }}>Saldo actual</div>
              <div style={{ color: '#5b2c83', fontSize: 30, fontWeight: 800, marginTop: 4 }}>1</div>
              <div style={{ color: '#8c7a58', fontSize: 13 }}>Incluye tu primera consulta gratuita</div>
            </div>

            <button style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: 'none', background: '#d6ad45', color: '#fff', fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>
              Volver con el central
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

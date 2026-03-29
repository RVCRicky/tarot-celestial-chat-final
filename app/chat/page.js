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
  const [credits, setCredits] = useState(0)
  const [freeQuestionUsed, setFreeQuestionUsed] = useState(false)
  const messagesEndRef = useRef(null)

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
        setCredits(profileData.credits || 0)
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
    const { data: authData } = await supabase.auth.getUser()

    const newProfile = {
      auth_user_id: authData.user.id,
      display_name: name.trim(),
      country: country.trim()
    }

    await supabase.from('profiles').insert(newProfile)

    setProfile(newProfile)
    setStep('chat')
    setCredits(0)
    addDelayedCentralMessage(
      `Perfecto ${name.trim()}, tienes una consulta gratis.`
    )
    setHasAskedTopic(true)
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const currentInput = input.trim()
    setMessages((prev) => [...prev, { sender: 'client', text: currentInput }])
    setInput('')

    if (!hasAskedTopic) {
      addDelayedCentralMessage('¿Qué deseas consultar?')
      setHasAskedTopic(true)
      return
    }

    // CONTROL CRÉDITOS
    if (!freeQuestionUsed) {
      setFreeQuestionUsed(true)
    } else {
      if (credits <= 0) {
        addDelayedCentralMessage('Necesitas créditos para continuar.')
        return
      }

      const { data: auth } = await supabase.auth.getUser()

      const { data: current } = await supabase
        .from('profiles')
        .select('credits')
        .eq('auth_user_id', auth.user.id)
        .single()

      const newCredits = (current?.credits || 0) - 1

      await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('auth_user_id', auth.user.id)

      setCredits(newCredits)
    }

    addDelayedCentralMessage('Te estoy leyendo, cielo...')
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div style={{ padding: 20 }}>
      <h2>Chat Tarot</h2>
      <p>Créditos: {credits}</p>

      <div style={{ minHeight: 300, border: '1px solid #ccc', padding: 10 }}>
        {messages.map((m, i) => (
          <div key={i}>
            <strong>{m.sender}:</strong> {m.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend}>Enviar</button>
    </div>
  )
}


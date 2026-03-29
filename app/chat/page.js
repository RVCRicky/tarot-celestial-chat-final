'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function ChatPage() {
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [credits, setCredits] = useState(0)
  const [freeQuestionUsed, setFreeQuestionUsed] = useState(false)
  const [loading, setLoading] = useState(true)

  const [mode, setMode] = useState('central') // central | reader
  const [activeReader, setActiveReader] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser()

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', auth.user.id)
        .single()

      setProfile(profileData)
      setCredits(profileData.credits || 0)

      addMessage('central',
        `Hola ${profileData.display_name}, bienvenida de nuevo a Tarot Celestial 💫 Cuéntame qué te preocupa y te ayudo a verlo claro.`
      )

      setLoading(false)
    }

    init()
  }, [])

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text }])
  }

  const connectToReader = (name) => {
    setMode('connecting')
    setActiveReader(name)

    setTimeout(() => {
      setMode('reader')
      setMessages([
        {
          sender: 'reader',
          text: `Hola cielo, soy ${name} de Tarot Celestial ✨ Estoy contigo, cuéntame qué necesitas.`
        }
      ])
    }, 1500)
  }

  const centralResponse = (text) => {
    const t = text.toLowerCase()

    if (t.includes('amor') || t.includes('ex') || t.includes('pareja')) {
      connectToReader('Aurora')
      return "Te paso con Aurora ahora mismo cielo 💫"
    }

    return "Cuéntame un poquito más cielo 💫"
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const text = input.trim()
    addMessage('client', text)
    setInput('')

    if (mode === 'central') {

      if (!freeQuestionUsed) {
        setFreeQuestionUsed(true)
      } else {
        if (credits <= 0) {
          addMessage('central', "Necesitas créditos para continuar.")
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

      const response = centralResponse(text)
      addMessage('central', response)
    }

    if (mode === 'reader') {
      addMessage('reader', "Estoy viendo tu consulta cielo ✨")
    }
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div style={{ padding: 20 }}>
      <h2>{mode === 'reader' ? activeReader : 'Central Tarot'}</h2>
      <p>Créditos: {credits}</p>

      {mode === 'connecting' && <p>Conectando con {activeReader}...</p>}

      <div style={{ minHeight: 300, border: '1px solid #ccc', padding: 10 }}>
        {messages.map((m, i) => (
          <div key={i}>
            <strong>{m.sender}:</strong> {m.text}
          </div>
        ))}
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


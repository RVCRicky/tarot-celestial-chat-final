'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function ChatPage() {
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser()

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', auth.user.id)
        .single()

      setProfile(profileData)

      addMessage('central',
        `Hola ${profileData.display_name}, bienvenida a Tarot Celestial 💫 Estoy aquí contigo cielo, cuéntame qué te preocupa y te ayudo a verlo claro.`
      )

      setLoading(false)
    }

    init()
  }, [])

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text }])
  }

  const handleCentral = (text) => {
    const t = text.toLowerCase()

    if (t.includes('amor') || t.includes('ex') || t.includes('pareja')) {
      addMessage('central',
        'Mira cielo, justo ahora tengo a Aurora libre y es de las mejores en temas de amor, vidente natural y medium 💫 Si quieres te la paso ahora mismo para que aproveches tu consulta gratuita.'
      )
      return
    }

    if (t.includes('trabajo') || t.includes('dinero')) {
      addMessage('central',
        'Para temas de trabajo cielo, ahora mismo María está conectada y conecta muy rápido con la energía laboral. Si quieres te paso con ella.'
      )
      return
    }

    addMessage('central',
      'Cuéntame con calma cielo, ¿qué es lo que más te preocupa ahora mismo? Estoy aquí para ayudarte 💫'
    )
  }

  const handleSend = () => {
    if (!input.trim()) return

    addMessage('client', input)
    handleCentral(input)
    setInput('')
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div style={{ padding: 20 }}>
      <h2>Chat Tarot</h2>

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


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
        `Hola ${profileData.display_name}, bienvenida de nuevo a Tarot Celestial 💫 Estoy aquí contigo cielo, cuéntame qué te preocupa y te ayudo a verlo claro.`
      )

      setLoading(false)
    }

    init()
  }, [])

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text }])
  }

  const centralResponse = (text) => {
    const t = text.toLowerCase()

    if (t.includes('amor') || t.includes('ex') || t.includes('pareja')) {
      return "Mira cielo, justo ahora tengo a Aurora libre y es de las mejores en temas de amor, vidente natural y medium 💫 Si quieres te la paso ahora mismo para que aproveches tu consulta gratuita."
    }

    if (t.includes('trabajo') || t.includes('dinero')) {
      return "Para temas de trabajo cielo, ahora mismo María está conectada y conecta muy rápido con la energía laboral. Si quieres te paso con ella."
    }

    return "Cuéntame con calma cielo, ¿qué es lo que más te preocupa ahora mismo? Estoy aquí para ayudarte 💫"
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const text = input.trim()
    addMessage('client', text)
    setInput('')

    // CONTROL CRÉDITOS
    if (!freeQuestionUsed) {
      setFreeQuestionUsed(true)
    } else {
      if (credits <= 0) {
        addMessage('central',
          "Cielo, para poder seguir con la consulta necesito activarte créditos. Puedes comprarlos ahora y seguimos justo donde lo dejamos 💫"
        )
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

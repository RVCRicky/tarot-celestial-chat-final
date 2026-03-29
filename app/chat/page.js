'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const READERS = [
  { name: 'Aurora', specialty: 'Amor', status: 'Libre' },
  { name: 'María', specialty: 'Trabajo', status: 'Libre' },
  { name: 'Sara', specialty: 'Decisiones', status: 'Libre' },
  { name: 'Luna', specialty: 'Energía', status: 'Libre' }
]

export default function ChatPage() {
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [credits, setCredits] = useState(0)
  const [mode, setMode] = useState('central')
  const [activeReader, setActiveReader] = useState(null)
  const [readers, setReaders] = useState(READERS)

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

      addMessage('central', `Hola ${profileData.display_name}, dime qué necesitas cielo 💫`)
    }

    init()
  }, [])

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text }])
  }

  const connectReader = (name) => {
    setMode('connecting')
    setActiveReader(name)

    setReaders(prev =>
      prev.map(r => r.name === name ? { ...r, status: 'Ocupada' } : r)
    )

    setTimeout(() => {
      setMode('reader')
      setMessages([{ sender: 'reader', text: `Hola cielo, soy ${name} ✨` }])
    }, 1200)
  }

  const backToCentral = () => {
    setMode('central')
    setActiveReader(null)

    setReaders(prev =>
      prev.map(r => ({ ...r, status: 'Libre' }))
    )

    addMessage('central', 'Ya estoy contigo otra vez cielo 💫')
  }

  const handleSend = () => {
    if (!input.trim()) return

    const t = input.toLowerCase()
    addMessage('client', input)
    setInput('')

    if (mode === 'central') {
      if (t.includes('amor')) {
        connectReader('Aurora')
        addMessage('central', 'Te paso con Aurora 💫')
      } else {
        addMessage('central', 'Cuéntame más cielo 💫')
      }
    } else {
      addMessage('reader', 'Estoy viendo tu consulta ✨')
    }
  }

  return (
    <div style={{ display: 'flex', gap: 20, padding: 20 }}>
      <div>
        <h3>Tarotistas</h3>
        {readers.map(r => (
          <div key={r.name} style={{ marginBottom: 10 }}>
            {r.name} - {r.status}
            {r.status === 'Libre' && (
              <button onClick={() => connectReader(r.name)}>Entrar</button>
            )}
          </div>
        ))}
        <button onClick={backToCentral}>Volver central</button>
      </div>

      <div style={{ flex: 1 }}>
        <h2>{mode === 'reader' ? activeReader : 'Central'}</h2>
        <p>Créditos: {credits}</p>

        {mode === 'connecting' && <p>Conectando...</p>}

        <div style={{ border: '1px solid #ccc', minHeight: 300, padding: 10 }}>
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
    </div>
  )
}


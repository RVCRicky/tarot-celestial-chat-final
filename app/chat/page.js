
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const ALL_READERS = [
  { name: 'Aurora', specialty: 'Amor' },
  { name: 'María', specialty: 'Trabajo' },
  { name: 'Luna', specialty: 'Energía' },
  { name: 'Sara', specialty: 'Decisiones' },
  { name: 'Candela', specialty: 'Reconciliaciones' },
  { name: 'Noa', specialty: 'Destino' },
  { name: 'Violeta', specialty: 'Alma gemela' },
  { name: 'Rocío', specialty: 'Infidelidad' },
  { name: 'Alma', specialty: 'Espiritualidad' },
  { name: 'Nerea', specialty: 'Respuestas rápidas' },
  { name: 'Mara', specialty: 'Medium' },
  { name: 'Estela', specialty: 'Dinero' }
]

function getOnlineReaders() {
  const hour = new Date().getHours()

  if (hour >= 6 && hour < 14) {
    return ALL_READERS.slice(0, 4)
  } else if (hour >= 14 && hour < 22) {
    return ALL_READERS.slice(4, 8)
  } else {
    return ALL_READERS.slice(8, 12)
  }
}

export default function ChatPage() {
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('central')
  const [activeReader, setActiveReader] = useState(null)
  const [readers, setReaders] = useState([])

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser()

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', auth.user.id)
        .single()

      setProfile(profileData)

      const online = getOnlineReaders()

      const mapped = ALL_READERS.map(r => {
        const isOnline = online.find(o => o.name === r.name)
        return {
          ...r,
          status: isOnline ? 'Libre' : 'Offline'
        }
      })

      setReaders(mapped)

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
      prev.map(r =>
        r.name === name ? { ...r, status: 'Ocupada' } : r
      )
    )

    setTimeout(() => {
      setMode('reader')
      setMessages([{ sender: 'reader', text: `Hola cielo, soy ${name} ✨` }])
    }, 1200)
  }

  const backToCentral = () => {
    setMode('central')
    setActiveReader(null)

    const online = getOnlineReaders()

    const mapped = ALL_READERS.map(r => {
      const isOnline = online.find(o => o.name === r.name)
      return {
        ...r,
        status: isOnline ? 'Libre' : 'Offline'
      }
    })

    setReaders(mapped)
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
          <div key={r.name} style={{ marginBottom: 8 }}>
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


'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Chat() {
  const [user, setUser] = useState(null)
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [profile, setProfile] = useState(null)
  const [step, setStep] = useState('loading')
  const [messages, setMessages] = useState([])

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return window.location.href = '/auth/login'
      setUser(data.user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .single()

      if (!profileData) {
        setStep('askData')
      } else {
        setProfile(profileData)
        setStep('chat')
        setMessages([
          { sender: 'central', text: `Hola ${profileData.display_name}, bienvenida de nuevo a Tarot Celestial 💜` }
        ])
      }
    }

    getUser()
  }, [])

  const saveProfile = async () => {
    const { data } = await supabase.auth.getUser()

    const newProfile = {
      auth_user_id: data.user.id,
      display_name: name,
      country: country
    }

    await supabase.from('profiles').insert(newProfile)

    setProfile(newProfile)
    setStep('chat')

    setMessages([
      { sender: 'central', text: `Perfecto ${name}, bienvenida a Tarot Celestial ✨ Tienes una consulta gratis, dime qué deseas saber.` }
    ])
  }

  if (step === 'loading') return <div style={{ padding: 40 }}>Cargando...</div>

  if (step === 'askData') {
    return (
      <div style={{ padding: 40 }}>
        <h2>Bienvenida 💜</h2>
        <p>Dime tu nombre y país</p>
        <input placeholder="Nombre" onChange={(e)=>setName(e.target.value)} />
        <input placeholder="País" onChange={(e)=>setCountry(e.target.value)} />
        <button onClick={saveProfile}>Continuar</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Chat Tarot Celestial</h2>
      <div>
        {messages.map((m,i)=>(
          <p key={i}><b>{m.sender}:</b> {m.text}</p>
        ))}
      </div>
    </div>
  )
}

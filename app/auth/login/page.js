'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert('Error al iniciar sesión')
      return
    }

    // 🔥 REDIRECCIÓN CLAVE
    router.push('/chat')
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Iniciar Sesión</h2>

      <input 
        placeholder="Email" 
        onChange={(e)=>setEmail(e.target.value)} 
      />

      <input 
        placeholder="Password" 
        type="password" 
        onChange={(e)=>setPassword(e.target.value)} 
      />

      <button onClick={handleLogin}>
        Entrar
      </button>
    </div>
  )
}

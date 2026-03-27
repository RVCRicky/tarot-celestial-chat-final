'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    await supabase.auth.signInWithPassword({
      email,
      password
    })
    alert('Login intentado')
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Iniciar Sesión</h2>
      <input placeholder="Email" onChange={(e)=>setEmail(e.target.value)} />
      <input placeholder="Password" type="password" onChange={(e)=>setPassword(e.target.value)} />
      <button onClick={handleLogin}>Entrar</button>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleRegister = async () => {
    await supabase.auth.signUp({
      email,
      password
    })
    alert('Usuario creado')
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Registro</h2>
      <input placeholder="Email" onChange={(e)=>setEmail(e.target.value)} />
      <input placeholder="Password" type="password" onChange={(e)=>setPassword(e.target.value)} />
      <button onClick={handleRegister}>Crear cuenta</button>
    </div>
  )
}

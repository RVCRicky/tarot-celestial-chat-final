'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

export default function Page() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    if (!supabase) {
      alert('Falta configurar Supabase en Vercel')
      return
    }

    setLoading(true)
    const result = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (result.error) {
      alert(result.error.message || 'No se pudo continuar')
      return
    }

    router.push('/chat')
  }

  const handleGoogle = async () => {
    if (!supabase) {
      alert('Falta configurar Supabase en Vercel')
      return
    }
    const origin = window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/chat` }
    })
    if (error) alert(error.message || 'No se pudo iniciar con Google')
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 520,
        background: '#fff',
        borderRadius: 24,
        border: '1px solid #efe1bc',
        boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)',
        padding: 28
      }}>
        <h1 style={{ color: '#5b2c83', marginTop: 0 }}>Iniciar sesión</h1>
        <div style={{ display: 'grid', gap: 12 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4' }} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Contraseña" style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4' }} />
          <button onClick={handleAction} disabled={loading} style={{ padding: '14px 18px', borderRadius: 14, border: 'none', background: '#6f3ea8', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
            {loading ? 'Cargando...' : 'Entrar'}
          </button>
          <button onClick={handleGoogle} style={{ padding: '14px 18px', borderRadius: 14, border: '1px solid #dccca4', background: '#fff', color: '#6f3ea8', fontWeight: 800, cursor: 'pointer' }}>
            Continuar con Google
          </button>
          <a href="/auth/register" style={{ color: '#6f3ea8', textDecoration: 'none', fontWeight: 700 }}>
            Crear cuenta
          </a>
        </div>
      </div>
    </main>
  )
}

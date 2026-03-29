'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PACKS = [
  { id: 'pack_3', name: '3 preguntas', price: '3,00 €', description: 'Ideal para una consulta breve' },
  { id: 'pack_5', name: '5 preguntas', price: '4,50 €', description: 'La opción más equilibrada' },
  { id: 'pack_10', name: '10 preguntas', price: '7,00 €', description: 'Para una consulta más profunda' }
]

export default function PaymentPage() {
  const [loadingPack, setLoadingPack] = useState(null)

  const handleCheckout = async (packId) => {
    try {
      setLoadingPack(packId)
      const { data } = await supabase.auth.getUser()
      const userId = data?.user?.id
      if (!userId) {
        alert('Debes iniciar sesión antes de comprar')
        return
      }

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId, userId })
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || 'No se pudo iniciar el pago')
        return
      }
      if (json.url) window.location.href = json.url
    } catch {
      alert('Hubo un error al conectar con Stripe')
    } finally {
      setLoadingPack(null)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)', padding: 24 }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #efe1bc', boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', padding: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/logo.png" alt="Tarot Celestial" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 12 }} />
            <h1 style={{ margin: 0, color: '#5b2c83' }}>Adquirir créditos</h1>
            <p style={{ color: '#8a6a2f' }}>Elige el paquete que prefieras y pasarás a la pasarela de pago segura.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
            {PACKS.map((pack) => (
              <div key={pack.id} style={{ background: '#faf7ff', border: '1px solid #ece1ff', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 250 }}>
                <div>
                  <div style={{ color: '#5b2c83', fontSize: 22, fontWeight: 800 }}>{pack.name}</div>
                  <div style={{ color: '#d6ad45', fontSize: 30, fontWeight: 800, marginTop: 12 }}>{pack.price}</div>
                  <p style={{ color: '#7a6690', lineHeight: 1.6 }}>{pack.description}</p>
                </div>
                <button onClick={() => handleCheckout(pack.id)} disabled={loadingPack === pack.id} style={{ marginTop: 14, padding: '14px 16px', borderRadius: 14, border: 'none', background: '#6f3ea8', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                  {loadingPack === pack.id ? 'Conectando...' : 'Comprar ahora'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

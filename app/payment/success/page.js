'use client'
import { useEffect } from 'react'

export default function PaymentSuccessPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tc_payment_success', '1')
      setTimeout(() => {
        window.location.href = '/chat'
      }, 2200)
    }
  }, [])

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)',
      padding: 24
    }}>
      <div style={{
        maxWidth: 680,
        width: '100%',
        background: '#fff',
        borderRadius: 24,
        border: '1px solid #efe1bc',
        boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)',
        padding: 28,
        textAlign: 'center'
      }}>
        <img src="/logo.png" alt="Tarot Celestial" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 12 }} />
        <h1 style={{ color: '#5b2c83' }}>Pago realizado</h1>
        <p style={{ color: '#7a6690', lineHeight: 1.7 }}>
          Perfecto cielo, el pago se ha completado correctamente. Volvemos al chat para seguir contigo...
        </p>
      </div>
    </main>
  )
}

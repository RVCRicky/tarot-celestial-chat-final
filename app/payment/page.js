import { Suspense } from 'react'
import PaymentClient from './PaymentClient'

function PaymentFallback() {
  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)', padding: 24 }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #efe1bc', boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', padding: 28, textAlign: 'center' }}>
          <img src="/logo.png" alt="Tarot Celestial" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 12 }} />
          <h1 style={{ margin: 0, color: '#5b2c83' }}>Adquirir créditos</h1>
          <p style={{ color: '#8a6a2f' }}>Estamos preparando la pasarela segura...</p>
        </div>
      </div>
    </main>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<PaymentFallback />}>
      <PaymentClient />
    </Suspense>
  )
}

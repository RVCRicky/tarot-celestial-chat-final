import { Suspense } from 'react'
import PaymentClient from './PaymentClient'

export default function PaymentPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)', padding: 24 }}><div style={{ color: '#5b2c83', fontSize: 18 }}>Preparando pago...</div></main>}>
      <PaymentClient />
    </Suspense>
  )
}

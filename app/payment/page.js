
import { Suspense } from 'react'
import PaymentClient from './PaymentClient'

export default function Page() {
  return (
    <Suspense fallback={<div style={{padding:20}}>Cargando pago...</div>}>
      <PaymentClient />
    </Suspense>
  )
}


'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function PaymentClient() {
  const params = useSearchParams()

  useEffect(() => {
    const pack = params.get('pack')
    if (pack) localStorage.setItem('selectedPack', pack)
  }, [params])

  return <div style={{padding:20}}>Procesando pago...</div>
}

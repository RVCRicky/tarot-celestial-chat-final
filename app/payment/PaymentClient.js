
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function PaymentClient() {
  const searchParams = useSearchParams()
  const [pack, setPack] = useState(null)

  useEffect(() => {
    const selectedPack = searchParams.get('pack')
    if (selectedPack) {
      setPack(selectedPack)
      localStorage.setItem('selectedPack', selectedPack)
    }
  }, [searchParams])

  return (
    <div style={{padding:20}}>
      <h1>Pago</h1>
      {pack && <p>Has seleccionado: {pack}</p>}
    </div>
  )
}

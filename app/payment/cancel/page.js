export default function PaymentCancelPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)', padding: 24 }}>
      <div style={{ maxWidth: 680, width: '100%', background: '#fff', borderRadius: 24, border: '1px solid #efe1bc', boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', padding: 28, textAlign: 'center' }}>
        <img src="/logo.png" alt="Tarot Celestial" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 12 }} />
        <h1 style={{ color: '#5b2c83' }}>Pago cancelado</h1>
        <p style={{ color: '#7a6690', lineHeight: 1.7 }}>No pasa nada, cielo. No se ha realizado ningún cobro.</p>
        <a href="/chat" style={{ display: 'inline-block', marginTop: 12, padding: '14px 18px', background: '#6f3ea8', color: '#fff', borderRadius: 14, textDecoration: 'none', fontWeight: 800 }}>Volver al chat</a>
      </div>
    </main>
  )
}

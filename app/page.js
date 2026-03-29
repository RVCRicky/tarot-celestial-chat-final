export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)',
      padding: 24,
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 860,
        background: '#fff',
        borderRadius: 28,
        border: '1px solid #efe1bc',
        boxShadow: '0 20px 60px rgba(88, 41, 125, 0.12)',
        padding: 40,
        textAlign: 'center'
      }}>
        <img src="/logo.png" alt="Tarot Celestial" style={{ width: 110, height: 110, objectFit: 'contain' }} />
        <h1 style={{ color: '#5b2c83', fontSize: 38, marginBottom: 10 }}>
          Bienvenido al chat de Tarot Celestial
        </h1>
        <p style={{ color: '#8a6a2f', fontSize: 18, marginTop: 0 }}>
          Siempre a tu lado
        </p>

        <div style={{ marginTop: 28, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/auth/login" style={{
            padding: '14px 22px',
            background: '#6f3ea8',
            color: '#fff',
            borderRadius: 14,
            textDecoration: 'none',
            fontWeight: 800
          }}>
            Iniciar sesión
          </a>
          <a href="/auth/register" style={{
            padding: '14px 22px',
            background: '#fff',
            color: '#6f3ea8',
            borderRadius: 14,
            textDecoration: 'none',
            fontWeight: 800,
            border: '1px solid #dccca4'
          }}>
            Registrarse
          </a>
        </div>

        <div style={{
          marginTop: 24,
          background: '#fffaf1',
          border: '1px solid #f0dfb2',
          borderRadius: 18,
          padding: 18,
          color: '#6d5832',
          lineHeight: 1.7
        }}>
          Consulta gratis al entrar, central humano con recomendaciones, tarotistas por turnos,
          compra de créditos con Stripe y continuidad de la consulta desde el chat.
        </div>
      </div>
    </main>
  )
}

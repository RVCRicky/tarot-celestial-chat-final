export default function Home() {
  return (
    <main style={{
      display: "flex",
      minHeight: "100vh",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f5f3ff, #ede9fe)"
    }}>
      <div style={{
        textAlign: "center",
        background: "white",
        padding: "40px",
        borderRadius: "20px"
      }}>
        <img src="/logo.png" style={{ width: 120 }} />
        <h1>Bienvenido al Chat de Tarot Celestial</h1>
        <p>Siempre a tu lado</p>

        <a href="/auth/login">Iniciar Sesión</a><br/>
        <a href="/auth/register">Registrarse</a><br/>
        <a href="/chat">Entrar al Chat</a>
      </div>
    </main>
  );
}

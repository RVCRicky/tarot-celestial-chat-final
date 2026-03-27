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
        borderRadius: "20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
      }}>
        <img src="/logo.png" alt="logo" style={{ width: "120px", marginBottom: "20px" }} />

        <h1 style={{ fontSize: "32px", color: "#5b21b6" }}>
          Bienvenido al Chat de Tarot Celestial
        </h1>

        <p style={{ marginTop: "10px", color: "#7c3aed" }}>
          Siempre a tu lado
        </p>

        <div style={{ marginTop: "30px", display: "flex", gap: "10px", justifyContent: "center" }}>
          <button style={{
            padding: "12px 20px",
            borderRadius: "10px",
            border: "none",
            background: "#5b21b6",
            color: "white",
            cursor: "pointer"
          }}>
            Iniciar Sesión
          </button>

          <button style={{
            padding: "12px 20px",
            borderRadius: "10px",
            border: "2px solid #5b21b6",
            background: "white",
            color: "#5b21b6",
            cursor: "pointer"
          }}>
            Registrarse
          </button>
        </div>
      </div>
    </main>
  );
}

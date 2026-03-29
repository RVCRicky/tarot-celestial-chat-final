'use client'
import { useEffect, useState } from 'react'

export default function AdminPage() {
  const [data, setData] = useState({ sessions: [], readers: [], profiles: [] })
  const [selectedSession, setSelectedSession] = useState(null)
  const [sessionMessages, setSessionMessages] = useState([])
  const [adminText, setAdminText] = useState('')
  const [creditAmount, setCreditAmount] = useState(1)

  const load = async () => {
    const res = await fetch('/api/admin/overview')
    const json = await res.json()
    setData(json)
  }

  const loadMessages = async (sessionId) => {
    const res = await fetch(`/api/session/messages?sessionId=${sessionId}`)
    const json = await res.json()
    setSessionMessages(json.messages || [])
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!selectedSession) return
    loadMessages(selectedSession.id)
    const id = setInterval(() => loadMessages(selectedSession.id), 4000)
    return () => clearInterval(id)
  }, [selectedSession])

  const forceReader = async (readerName, forceStatus, currentStatus) => {
    await fetch('/api/admin/reader-force', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readerName, forceStatus, currentStatus })
    })
    load()
  }

  const addCredits = async (profileId) => {
    await fetch('/api/admin/add-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, amount: creditAmount })
    })
    load()
  }

  const intervene = async () => {
    if (!selectedSession || !adminText.trim()) return
    await fetch('/api/admin/intervene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: selectedSession.id, adminName: 'Admin', text: adminText })
    })
    setAdminText('')
    loadMessages(selectedSession.id)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f6f3ff', padding: 20, boxSizing: 'border-box' }}>
      <h1 style={{ color: '#5b2c83' }}>Panel Admin · Tarot Celestial</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: 16 }}>
        <section style={{ background: '#fff', borderRadius: 18, padding: 16, border: '1px solid #ece1ff' }}>
          <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Tarotistas</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {(data.readers || []).map((reader) => (
              <div key={reader.reader_name} style={{ padding: 10, borderRadius: 12, background: '#faf7ff', border: '1px solid #ece1ff' }}>
                <strong>{reader.reader_name}</strong>
                <div>Estado: {reader.status}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => forceReader(reader.reader_name, 'online', reader.status)}>Forzar online</button>
                  <button onClick={() => forceReader(reader.reader_name, 'offline', reader.status)}>Forzar offline</button>
                  <button onClick={() => forceReader(reader.reader_name, null, reader.status)}>Auto</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#fff', borderRadius: 18, padding: 16, border: '1px solid #ece1ff' }}>
          <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Chats activos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 12 }}>
            <div style={{ maxHeight: 70 * 8, overflowY: 'auto', borderRight: '1px solid #eee', paddingRight: 12 }}>
              {(data.sessions || []).map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, padding: 10, borderRadius: 12, border: '1px solid #ddd', background: selectedSession?.id === session.id ? '#f1e8ff' : '#fff' }}
                >
                  <strong>{session.current_reader_name || 'Central'}</strong>
                  <div>Modo: {session.mode}</div>
                  <div>Session: {session.id.slice(0, 8)}</div>
                </button>
              ))}
            </div>

            <div>
              <div style={{ minHeight: 420, maxHeight: 420, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
                {sessionMessages.map((m) => (
                  <div key={m.id} style={{ marginBottom: 10 }}>
                    <strong>{m.sender_name || m.sender}:</strong> {m.text}
                  </div>
                ))}
              </div>
              {selectedSession && (
                <div style={{ marginTop: 10 }}>
                  <textarea value={adminText} onChange={(e) => setAdminText(e.target.value)} placeholder="Intervenir como humano..." style={{ width: '100%', minHeight: 80, boxSizing: 'border-box' }} />
                  <button onClick={intervene} style={{ marginTop: 8 }}>Enviar intervención</button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section style={{ background: '#fff', borderRadius: 18, padding: 16, border: '1px solid #ece1ff' }}>
          <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Usuarios</h3>
          <div style={{ marginBottom: 8 }}>
            <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(Number(e.target.value || 0))} />
          </div>
          <div style={{ display: 'grid', gap: 10, maxHeight: 70 * 8, overflowY: 'auto' }}>
            {(data.profiles || []).map((profile) => (
              <div key={profile.id} style={{ padding: 10, borderRadius: 12, background: '#faf7ff', border: '1px solid #ece1ff' }}>
                <strong>{profile.display_name || 'Sin nombre'}</strong>
                <div>{profile.email || ''}</div>
                <div>Créditos: {profile.credits}</div>
                <button onClick={() => addCredits(profile.id)}>Añadir bono</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

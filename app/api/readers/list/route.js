import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const now = new Date()

    // 🔥 1. limpiar sesiones muertas
    await supabase
      .from('sessions')
      .update({ status: 'closed' })
      .lt(
        'last_activity',
        new Date(Date.now() - 30000).toISOString()
      )
      .eq('status', 'active')

    // 🔥 2. traer readers
    const { data: readers, error: rError } = await supabase
      .from('readers')
      .select('*')

    if (rError) throw rError

    // 🔥 3. traer sesiones activas
    const { data: sessions, error: sError } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active')

    if (sError) throw sError

    // 🔥 4. calcular estado REAL
    const result = readers.map((reader) => {
      const activeSession = sessions.find(
        (s) => s.reader_name === reader.name
      )

      if (!activeSession) {
        return { ...reader, status: 'Libre' }
      }

      const diff =
        (now - new Date(activeSession.last_activity)) / 1000

      if (diff > 30) {
        return { ...reader, status: 'Libre' }
      }

      return { ...reader, status: 'Ocupada' }
    })

    return new Response(JSON.stringify({ readers: result }))
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
}


import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const now = new Date()

    // limpiar sesiones muertas
    await supabase
      .from('sessions')
      .update({ status: 'closed' })
      .lt('last_activity', new Date(Date.now() - 30000).toISOString())
      .eq('status', 'active')

    const { data: readers, error: rError } = await supabase
      .from('readers')
      .select('*')

    if (rError) throw rError

    const { data: sessions, error: sError } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active')

    if (sError) throw sError

    const result = readers.map((reader) => {
      const active = sessions.find(s => s.reader_id === reader.id)

      if (!active) return { ...reader, status: 'Libre' }

      const diff = (now - new Date(active.last_activity)) / 1000

      if (diff > 30) return { ...reader, status: 'Libre' }

      return { ...reader, status: 'Ocupada' }
    })

    return new Response(JSON.stringify(result))
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

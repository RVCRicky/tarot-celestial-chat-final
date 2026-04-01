import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    // 1. traer readers SIEMPRE
    const { data: readers, error: readersError } = await supabase
      .from('readers')
      .select('*')

    if (readersError) throw readersError

    // 2. intentar traer sesiones activas (sin romper si falla)
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active')

    // 3. fallback si no hay sesiones
    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ readers }))
    }

    // 4. marcar ocupadas SOLO si coincide por nombre
    const result = readers.map((reader) => {
      const isBusy = sessions.some(
        (s) =>
          s.reader_name === reader.name &&
          s.status === 'active'
      )

      return {
        ...reader,
        status: isBusy ? 'Ocupada' : reader.status || 'Libre'
      }
    })

    return new Response(JSON.stringify({ readers: result }))
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
}

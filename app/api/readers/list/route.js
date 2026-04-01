import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  try {
    // 🔥 1. traer readers SIEMPRE
    const { data: readers, error } = await supabase
      .from('readers')
      .select('*')

    if (error) {
      console.error('Error readers:', error)
      return new Response(JSON.stringify({ readers: [] }))
    }

    // 🔥 2. traer sesiones activas (sin romper si falla)
    let sessions = []
    try {
      const res = await supabase
        .from('sessions')
        .select('reader_name, status')
        .eq('status', 'active')

      sessions = res.data || []
    } catch (e) {
      console.log('sessions fallback')
    }

    // 🔥 3. marcar ocupadas
    const readersFinal = readers.map((reader) => {
      const isBusy = sessions.some(
        (s) => s.reader_name === reader.name
      )

      return {
        ...reader,
        status: isBusy ? 'Ocupada' : reader.status || 'Libre'
      }
    })

    return new Response(
      JSON.stringify({ readers: readersFinal }),
      { status: 200 }
    )
  } catch (err) {
    console.error('fatal error readers list:', err)

    // 🔥 fallback TOTAL para no romper frontend
    return new Response(
      JSON.stringify({ readers: [] }),
      { status: 200 }
    )
  }
}

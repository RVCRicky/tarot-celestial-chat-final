import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // 🔥 IMPORTANTE
    )

    // 1. readers
    const { data: readers, error } = await supabase
      .from('readers')
      .select('*')

    if (error) {
      console.error('ERROR READERS:', error)
      return new Response(JSON.stringify({ readers: [] }), { status: 200 })
    }

    // 2. sesiones activas (opcional)
    let sessions = []
    try {
      const { data } = await supabase
        .from('sessions')
        .select('reader_name')
        .eq('status', 'active')

      sessions = data || []
    } catch (e) {
      console.log('sessions error ignored')
    }

    // 3. marcar ocupadas
    const result = readers.map(r => {
      const busy = sessions.find(s => s.reader_name === r.name)

      return {
        ...r,
        status: busy ? 'Ocupada' : (r.status || 'Libre')
      }
    })

    return new Response(
      JSON.stringify({ readers: result }),
      { status: 200 }
    )

  } catch (err) {
    console.error('FATAL ERROR:', err)

    return new Response(
      JSON.stringify({ readers: [] }),
      { status: 200 }
    )
  }
}

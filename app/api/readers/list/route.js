import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 🔥 1. TRAER ESTADOS REALES
    const { data, error } = await supabase
      .from('reader_statuses')
      .select('*')

    if (error) {
      console.error('ERROR reader_statuses:', error)
      return new Response(JSON.stringify({ readers: [] }), { status: 200 })
    }

    // 🔥 traducir turno
    const translateShift = (shift) => {
      switch (shift) {
        case 'morning':
          return 'Mañana'
        case 'afternoon':
          return 'Tarde'
        case 'night':
          return 'Noche'
        default:
          return shift || ''
      }
    }

    // 🔥 2. MAPEO CORRECTO
    const readers = (data || []).map(r => {
      let finalStatus = r.status || 'Libre'

      // 🔥 prioridad absoluta: sesión activa
      if (r.active_session_id) {
        finalStatus = 'Ocupada'
      }

      // 🔥 fallback si claim no guarda bien
      if (r.occupied_by_profile_id) {
        finalStatus = 'Ocupada'
      }

      return {
        name: r.reader_name,
        specialty: translateShift(r.shift), // 👈 traducido
        status: finalStatus
      }
    })

    return new Response(
      JSON.stringify({ readers }),
      { status: 200 }
    )

  } catch (err) {
    console.error('FATAL readers list:', err)

    return new Response(
      JSON.stringify({ readers: [] }),
      { status: 200 }
    )
  }
}

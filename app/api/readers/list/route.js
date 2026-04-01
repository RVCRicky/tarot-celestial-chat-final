import { supabase } from '../../../lib/supabaseClient'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('readers')
      .select('*')

    if (error) {
      console.error(error)
      return new Response(JSON.stringify({ readers: [] }))
    }

    // 🔥 MUY IMPORTANTE → devolver en formato correcto
    return new Response(
      JSON.stringify({ readers: data }),
      { status: 200 }
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ readers: [] }),
      { status: 200 }
    )
  }
}

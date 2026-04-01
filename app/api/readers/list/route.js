import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabase
      .from('readers')
      .select('*')

    if (error) {
      console.error('ERROR READERS:', error)
      return new Response(JSON.stringify({ readers: [] }), { status: 200 })
    }

    return new Response(
      JSON.stringify({ readers: data }),
      { status: 200 }
    )

  } catch (err) {
    console.error('FATAL:', err)

    return new Response(
      JSON.stringify({ readers: [] }),
      { status: 200 }
    )
  }
}

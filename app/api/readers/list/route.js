// PRO readers list with computed status
export default async function handler(req, res) {
  const { supabase } = req

  const now = new Date()

  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id, heartbeat_at, current_reader_name')
    .eq('status', 'active')

  const { data: readers } = await supabase
    .from('reader_statuses')
    .select('*')

  const result = readers.map(reader => {
    const session = sessions.find(
      s => s.current_reader_name === reader.reader_name
    )

    const inShift = true // TODO: implement shift logic

    if (!inShift) return { ...reader, computed_status: 'Offline' }

    if (!session) return { ...reader, computed_status: 'Libre' }

    const seconds = (now - new Date(session.heartbeat_at)) / 1000

    if (seconds < 20) return { ...reader, computed_status: 'Ocupada' }

    return { ...reader, computed_status: 'Libre' }
  })

  res.json(result)
}

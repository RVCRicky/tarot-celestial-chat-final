import { READERS, SESSION_STALE_MS, isShiftActive } from './chatShared'

export function statusFromShift(readerName, adminForceStatus = null, date = new Date()) {
  if (adminForceStatus === 'offline') return 'Offline'
  if (adminForceStatus === 'online') return 'Libre'

  const reader = READERS.find((item) => item.name === readerName)
  if (!reader) return 'Offline'
  return isShiftActive(reader.shift, date) ? 'Libre' : 'Offline'
}

export function isSessionFresh(session, now = Date.now()) {
  if (!session?.heartbeat_at || session.status !== 'active') return false
  const heartbeatMs = new Date(session.heartbeat_at).getTime()
  if (!Number.isFinite(heartbeatMs)) return false
  return now - heartbeatMs <= SESSION_STALE_MS
}

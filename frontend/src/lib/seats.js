import { AREAS, HOLD_WINDOW, HOUR, MINUTE, SESSION_LIMIT } from '../data/mockData.js'

export function getArea(areaId) {
  return AREAS.find((area) => area.id === areaId) ?? AREAS[0]
}

export function getSeatStats(seats) {
  return seats.reduce(
    (stats, seat) => {
      stats.total += 1
      if (seat.status === 'vacant') stats.vacant += 1
      if (seat.status === 'occupied') stats.occupied += 1
      if (seat.status === 'pending') stats.pending += 1
      if (seat.status === 'overdue') stats.overdue += 1
      return stats
    },
    { total: 0, vacant: 0, occupied: 0, pending: 0, overdue: 0 },
  )
}

export function getSessionStart(seat) {
  return seat.session?.occupiedAt ?? seat.session?.reservedAt ?? null
}

export function getSessionDuration(seat, now) {
  const start = getSessionStart(seat)
  return start ? Math.max(0, now - start) : 0
}

export function isHoldExpired(seat, now) {
  return Boolean(
    seat.status === 'pending' &&
      seat.session?.claimDeadline &&
      now >= seat.session.claimDeadline,
  )
}

export function getAttentionRows(seats, now) {
  return seats
    .filter((seat) => {
      if (seat.status === 'overdue') return true
      if (seat.status === 'pending') {
        return seat.session.claimDeadline - now <= 5 * MINUTE
      }
      if (seat.status === 'occupied') {
        return seat.session.dueAt - now <= 15 * MINUTE
      }
      return false
    })
    .sort((a, b) => {
      const priority = { overdue: 0, pending: 1, occupied: 2 }
      return priority[a.status] - priority[b.status]
    })
}

export function attentionReason(seat, now) {
  if (seat.status === 'overdue') {
    const over = now - seat.session.dueAt
    return `Overdue by ${formatShort(over)}`
  }

  if (seat.status === 'pending') {
    const left = Math.max(0, seat.session.claimDeadline - now)
    return left > 0 ? `Hold ends in ${formatShort(left)}` : 'Hold expired'
  }

  if (seat.status === 'occupied') {
    const left = Math.max(0, seat.session.dueAt - now)
    return `Due in ${formatShort(left)}`
  }

  return ''
}

export function formatShort(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / MINUTE))
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

export function getWindowProgress(seat, now) {
  if (seat.status === 'pending') {
    const total = HOLD_WINDOW
    const left = Math.max(0, seat.session.claimDeadline - now)
    return { elapsed: total - left, total, left, tone: left === 0 ? 'danger' : 'signal' }
  }

  if (seat.status === 'occupied' || seat.status === 'overdue') {
    const total = SESSION_LIMIT
    const elapsed = Math.max(0, now - seat.session.occupiedAt)
    return {
      elapsed: Math.min(elapsed, total),
      total,
      left: Math.max(0, seat.session.dueAt - now),
      tone: elapsed >= total ? 'danger' : elapsed > total - 15 * MINUTE ? 'amber' : 'signal',
    }
  }

  return { elapsed: 0, total: HOLD_WINDOW, left: HOLD_WINDOW, tone: 'signal' }
}

export function getSessionRows(seats, now) {
  return seats
    .filter((seat) => seat.session)
    .map((seat) => ({
      seat,
      area: getArea(seat.areaId),
      start: getSessionStart(seat),
      duration: getSessionDuration(seat, now),
      overdueMs:
        seat.status === 'overdue' ? Math.max(0, now - seat.session.dueAt) : 0,
    }))
    .sort((a, b) => b.duration - a.duration)
}

export function hoursUntilClose() {
  const now = new Date()
  const close = new Date(now)
  close.setHours(21, 0, 0, 0)
  const diff = close.getTime() - now.getTime()
  return diff > 0 ? diff : 0
}

export { HOLD_WINDOW, HOUR, MINUTE, SESSION_LIMIT }

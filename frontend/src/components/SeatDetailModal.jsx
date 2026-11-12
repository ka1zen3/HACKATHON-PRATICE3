import { useState } from 'react'
import { Clock, DoorOpen, UserRound } from 'lucide-react'
import { Button } from './Button.jsx'
import { Modal } from './Modal.jsx'
import { StatusPill } from './StatusPill.jsx'
import { useNow } from '../hooks/useNow.js'
import { formatClock, formatTimeOfDay } from '../lib/format.js'
import {
  attentionReason,
  formatShort,
  getArea,
  getSessionDuration,
  getSessionStart,
  isHoldExpired,
} from '../lib/seats.js'

export function SeatDetailModal({ seat, open, onClose, onForceTimeOut }) {
  const [confirming, setConfirming] = useState(false)
  const now = useNow()

  if (!seat) return null

  const area = getArea(seat.areaId)
  const start = getSessionStart(seat)
  const duration = getSessionDuration(seat, now)
  const expired = isHoldExpired(seat, now)
  const busy = seat.status !== 'vacant'

  const handleClose = () => {
    setConfirming(false)
    onClose()
  }

  const handleForce = () => {
    setConfirming(false)
    onForceTimeOut(seat.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Seat ${seat.label}`}
      description={`${area.name} · ${area.floor}`}
      footer={
        busy ? (
          confirming ? (
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Keep session
              </Button>
              <Button variant="danger" onClick={handleForce}>
                Yes, release seat
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button variant="danger" onClick={() => setConfirming(true)}>
                <DoorOpen className="size-4" aria-hidden="true" />
                Force time-out
              </Button>
            </>
          )
        ) : (
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        )
      }
    >
      <div className="flex items-center justify-between gap-4 rounded-inner border border-ash bg-parchment px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] text-ink-soft">Current state</p>
          <p className="mt-1 text-[18px] font-medium">
            {expired ? 'Hold expired' : seat.status === 'vacant' ? 'Open seat' : 'Session in progress'}
          </p>
        </div>
        <StatusPill
          status={expired ? 'expired' : seat.status}
          pulse={seat.status === 'pending' && !expired}
        >
          {expired ? 'Expired' : seat.status === 'vacant' ? 'Open' : seat.status}
        </StatusPill>
      </div>

      {busy ? (
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="inline-flex items-center gap-2 text-ink-soft">
              <UserRound className="size-4" aria-hidden="true" />
              Student
            </dt>
            <dd className="text-right font-medium">{seat.session.studentName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-soft">Student number</dt>
            <dd className="numeric text-right">{seat.session.studentNumber}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="inline-flex items-center gap-2 text-ink-soft">
              <Clock className="size-4" aria-hidden="true" />
              {seat.status === 'pending' ? 'Held since' : 'Started'}
            </dt>
            <dd className="numeric text-right">
              {start ? formatTimeOfDay(start) : '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-soft">Elapsed</dt>
            <dd className="numeric text-right">{formatClock(duration)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-soft">
              {seat.status === 'pending' ? 'Claim by' : 'Session ends'}
            </dt>
            <dd className="numeric text-right">
              {seat.status === 'pending'
                ? formatTimeOfDay(seat.session.claimDeadline)
                : formatTimeOfDay(seat.session.dueAt)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-ash pt-3">
            <dt className="text-ink-soft">Watch</dt>
            <dd className="text-right font-medium text-amber">{attentionReason(seat, now)}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-5 text-sm leading-relaxed text-ink-soft">
          This seat is open. Students can claim it from the live map or the reserve flow.
        </p>
      )}

      {confirming && (
        <div className="mt-5 rounded-inner border border-danger/25 bg-danger-wash p-4 text-sm text-danger">
          <p className="font-medium">Release this seat now?</p>
          <p className="mt-1 leading-relaxed text-danger/80">
            The student&apos;s session ends immediately and the seat returns to the live map.
            {duration > 0 ? ` Current session: ${formatShort(duration)}.` : ''}
          </p>
        </div>
      )}
    </Modal>
  )
}

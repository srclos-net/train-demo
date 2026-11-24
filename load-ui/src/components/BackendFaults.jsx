import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || '/api'

// Local copy of App.jsx's palette — App.jsx defines it inline, and importing
// from App.jsx would be circular (App.jsx mounts this component).
const C = {
  surface: '#0d1117',
  panel:   '#161b22',
  border:  '#21262d',
  red:     '#f85149',
  dim:     '#8b949e',
  fg:      '#e6edf3',
}

// via-trains booking-service fault modes. Global to the backend —
// every kiosk sees these; nothing here is per-kiosk.
const MODES = [
  { mode: 'slow_db',         icon: '⏱', label: 'Slow DB',         desc: 'Adds latency to booking-service DB queries' },
  { mode: 'booking_failure', icon: '✕', label: 'Booking Failure', desc: 'Booking-service rejects new bookings' },
  { mode: 'pool_exhaustion', icon: '⚡', label: 'Pool Exhaustion', desc: 'Exhausts the booking-service DB pool' },
]

// Talks to the load-generator relay (which forwards to booking-service).
// JSON parsing is guarded: a non-JSON body must never throw into React state.
async function relayFetch(path, opts = {}) {
  const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...opts })
  let body = null
  try { body = await res.json() } catch { /* non-JSON — treat as no data */ }
  return { ok: res.ok, body }
}

export default function BackendFaults() {
  const [active, setActive] = useState(new Set())
  const [slowDbMs, setSlowDbMs] = useState(null)
  const [disconnected, setDisconnected] = useState(false)
  const [pending, setPending] = useState(null)

  const poll = useCallback(async () => {
    try {
      const { ok, body } = await relayFetch('/backend-faults')
      if (!ok) { setDisconnected(true); return }
      setDisconnected(false)
      if (body && Array.isArray(body.active_faults)) {
        setActive(new Set(body.active_faults))
        setSlowDbMs(typeof body.slow_db_ms === 'number' ? body.slow_db_ms : null)
      }
    } catch {
      setDisconnected(true)
    }
  }, [])

  useEffect(() => {
    poll()
    const t = setInterval(poll, 3000)
    return () => clearInterval(t)
  }, [poll])

  async function toggle(mode) {
    if (disconnected || pending) return
    setPending(mode)
    const method = active.has(mode) ? 'DELETE' : 'POST'
    try {
      await relayFetch('/backend-faults/' + mode, { method })
    } catch {
      /* relay unreachable — the re-sync poll below flags it */
    } finally {
      setPending(null)
      poll()
    }
  }

  const activeCount = active.size

  return (
    <section style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 8px' }}>
        <span style={{ fontSize: 9, letterSpacing: 3, color: C.dim, textTransform: 'uppercase' }}>
          Backend Faults (via-trains)
        </span>
        {activeCount > 0 && (
          <span style={{ fontSize: 9, letterSpacing: 1, color: C.red, background: 'rgba(248, 81, 73, 0.12)', padding: '1px 6px', borderRadius: 8 }}>
            {activeCount} ACTIVE
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9, letterSpacing: 1, color: C.dim, textTransform: 'uppercase' }}>
          global — affects all kiosks
        </span>
      </div>
      <div style={{ height: 1, background: C.border }} />
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {disconnected && (
          <div style={{ padding: '10px 12px', border: `1px solid ${C.red}`, borderRadius: 6, color: C.red, fontSize: 10, letterSpacing: 1, background: 'rgba(248, 81, 73, 0.08)' }}>
            ⚠ booking-service unreachable — backend faults cannot be controlled
          </div>
        )}
        {MODES.map(({ mode, icon, label, desc }) => {
          const on = active.has(mode)
          const detail = mode === 'slow_db' && on && slowDbMs != null ? `+${slowDbMs} ms latency` : desc
          return (
            <button key={mode} onClick={() => toggle(mode)} disabled={disconnected || pending !== null}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                background: on ? 'rgba(248, 81, 73, 0.08)' : C.panel,
                border: `1px solid ${on ? C.red : C.border}`,
                borderRadius: 6,
                cursor: disconnected || pending ? 'not-allowed' : 'pointer',
                opacity: disconnected ? 0.45 : 1,
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: C.fg,
                textAlign: 'left',
              }}>
              <span style={{ fontSize: 13, color: on ? C.red : C.dim }}>{icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ letterSpacing: 1 }}>{label.toUpperCase()}</span>
                <span style={{ color: C.dim, marginLeft: 8, fontSize: 10 }}>{detail}</span>
              </span>
              <span style={{
                width: 34, height: 18, borderRadius: 9, position: 'relative', flexShrink: 0,
                background: on ? C.red : C.border,
              }}>
                <span style={{
                  position: 'absolute', top: 2, left: on ? 18 : 2, width: 14, height: 14,
                  borderRadius: '50%', background: C.fg,
                }} />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

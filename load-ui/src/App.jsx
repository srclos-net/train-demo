import { useState, useEffect, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || '/api'

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0a0e1a',
  surface: '#0d1117',
  panel:   '#161b22',
  border:  '#21262d',
  orange:  '#FF6600',
  red:     '#f85149',
  green:   '#3fb950',
  yellow:  '#e3b341',
  blue:    '#79c0ff',
  purple:  '#d2a8ff',
  dim:     '#8b949e',
  fg:      '#e6edf3',
}

const FAULT_META = {
  booking_error: { label: 'Booking Error',   color: C.red,    icon: '✕', desc: '503 from payment processor' },
  slow_perf:     { label: 'Slow Perf',       color: C.yellow, icon: '⏱', desc: 'P95 > 5s booking latency' },
  missing_ads:   { label: 'Missing Ads',     color: C.purple, icon: '□', desc: 'Ad CDN 404 — revenue impact' },
  app_crash:     { label: 'App Crash',       color: C.orange, icon: '⚡', desc: 'ChunkLoadError on boot' },
}

const DURATION_OPTIONS = [
  { label: '30s',  ms: 30000 },
  { label: '1m',   ms: 60000 },
  { label: '2m',   ms: 120000 },
  { label: '5m',   ms: 300000 },
  { label: '∞',    ms: 86400000 },
]

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  return res.json()
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [status,    setStatus]    = useState(null)
  const [regions,   setRegions]   = useState(null)
  const [log,       setLog]       = useState([])
  const [error,     setError]     = useState(null)
  const pollRef = useRef(null)

  const pushLog = useCallback((msg, level = 'info') => {
    setLog(l => [{ ts: new Date().toLocaleTimeString(), msg, level }, ...l].slice(0, 60))
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiFetch('/status')
      setStatus(data)
      setError(null)
    } catch (e) {
      setError('Cannot reach load generator — is it running?')
    }
  }, [])

  useEffect(() => {
    apiFetch('/regions').then(d => setRegions(d)).catch(() => {})
    fetchStatus()
    pollRef.current = setInterval(fetchStatus, 3000)
    return () => clearInterval(pollRef.current)
  }, [fetchStatus])

  async function injectFault({ type, scope, target, intensity, durationMs }) {
    try {
      const data = await apiFetch('/fault/inject', {
        method: 'POST',
        body: JSON.stringify({ type, scope, target, intensity, durationMs }),
      })
      pushLog(`INJECTED ${FAULT_META[type].label} → ${scope}:${target} (${Math.round(intensity*100)}%, ${durationMs/1000}s)`, 'warn')
      fetchStatus()
    } catch (e) {
      pushLog(`Failed to inject fault: ${e.message}`, 'error')
    }
  }

  async function clearFault(faultId) {
    await apiFetch('/fault/clear', { method: 'POST', body: JSON.stringify({ faultId }) })
    pushLog(`Cleared fault ${faultId}`, 'info')
    fetchStatus()
  }

  async function clearAll() {
    await apiFetch('/fault/clear-all', { method: 'POST', body: '{}' })
    pushLog('All faults cleared', 'info')
    fetchStatus()
  }

  const activeFaults = status?.activeFaults || []
  const totalKiosks  = status?.totalKiosks || 0

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", background: C.bg, minHeight: '100vh', color: C.fg, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #333; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .fault-pill { animation: fadeIn 0.2s ease; }
        .row-hover:hover { background: rgba(255,255,255,0.03) !important; }
        button { cursor: pointer; font-family: inherit; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, color: C.orange }}>VIA RAIL</div>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: 2 }}>LOAD CONTROL</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {error
            ? <span style={{ fontSize: 10, color: C.red, letterSpacing: 1 }}>● {error}</span>
            : <span style={{ fontSize: 10, color: C.green, letterSpacing: 1 }}>● {totalKiosks} KIOSKS RUNNING</span>
          }
          {activeFaults.length > 0 && (
            <button onClick={clearAll} style={{ background: 'transparent', border: `1px solid ${C.red}`, color: C.red, padding: '4px 12px', fontSize: 10, letterSpacing: 1 }}>
              CLEAR ALL FAULTS ({activeFaults.length})
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* MAIN PANEL */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ACTIVE FAULTS */}
          {activeFaults.length > 0 && (
            <div>
              <SectionHeader title="ACTIVE FAULTS" count={activeFaults.length} countColor={C.red} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {activeFaults.map(f => (
                  <ActiveFaultPill key={f.id} fault={f} onClear={() => clearFault(f.id)} />
                ))}
              </div>
            </div>
          )}

          {/* QUICK SCENARIOS */}
          <div>
            <SectionHeader title="QUICK SCENARIOS" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginTop: 8 }}>
              {regions && Object.entries(regions.regions).map(([regionKey, region]) => (
                <ScenarioCard
                  key={regionKey}
                  regionKey={regionKey}
                  region={region}
                  status={status?.regions?.[regionKey]}
                  onInject={injectFault}
                />
              ))}
              {/* All-regions scenario */}
              <NuclearCard onInject={injectFault} />
            </div>
          </div>

          {/* REGION DETAIL */}
          {status && regions && (
            <div>
              <SectionHeader title="REGION STATUS" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                {Object.entries(regions.regions).map(([regionKey, region]) => (
                  <RegionPanel
                    key={regionKey}
                    regionKey={regionKey}
                    region={region}
                    status={status.regions?.[regionKey]}
                    onInject={injectFault}
                    activeFaults={activeFaults}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR — log + fault builder */}
        <div style={{ width: 300, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <CustomFaultBuilder regions={regions} onInject={injectFault} />
          <div style={{ flex: 1, overflow: 'auto', borderTop: `1px solid ${C.border}` }}>
            <EventLog log={log} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, count, countColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: C.dim }}>{title}</div>
      {count !== undefined && (
        <div style={{ fontSize: 9, background: `${countColor}22`, color: countColor, padding: '1px 6px', letterSpacing: 1 }}>{count}</div>
      )}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

// ── Active fault pill ─────────────────────────────────────────────────────────
function ActiveFaultPill({ fault, onClear }) {
  const meta = FAULT_META[fault.type] || {}
  const remaining = Math.max(0, Math.round((fault.expiresAt - Date.now()) / 1000))
  const isInfinite = fault.durationMs >= 86400000

  return (
    <div className="fault-pill" style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.panel, border: `1px solid ${meta.color}44`, padding: '6px 10px' }}>
      <span style={{ color: meta.color, fontSize: 12 }}>{meta.icon}</span>
      <div>
        <div style={{ fontSize: 10, color: meta.color, letterSpacing: 0.5 }}>{meta.label}</div>
        <div style={{ fontSize: 9, color: C.dim }}>{fault.scope}:{fault.target} · {fault.affectedCount} kiosks · {isInfinite ? '∞' : `${remaining}s`}</div>
      </div>
      <button onClick={onClear} style={{ marginLeft: 4, background: 'transparent', border: 'none', color: C.dim, fontSize: 12, padding: '0 2px' }}>✕</button>
    </div>
  )
}

// ── Quick scenario card per region ────────────────────────────────────────────
function ScenarioCard({ regionKey, region, status, onInject }) {
  const [selFault,    setSelFault]    = useState('booking_error')
  const [selDuration, setSelDuration] = useState(60000)
  const [intensity,   setIntensity]   = useState(1.0)

  const totalKiosks = region.stations.reduce((s, st) => s + st.kiosks, 0)
  const meta = FAULT_META[selFault]

  function fire() {
    onInject({ type: selFault, scope: 'region', target: regionKey, intensity, durationMs: selDuration })
  }

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 2, color: C.fg }}>{region.name}</div>
          <div style={{ fontSize: 9, color: C.dim }}>{totalKiosks} kiosks · {region.stations.length} stations</div>
        </div>
        <RegionHealth status={status} />
      </div>

      {/* Fault type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
        {Object.entries(FAULT_META).map(([key, m]) => (
          <button key={key} onClick={() => setSelFault(key)} style={{
            background: selFault === key ? `${m.color}22` : 'transparent',
            border: `1px solid ${selFault === key ? m.color : C.border}`,
            color: selFault === key ? m.color : C.dim,
            padding: '4px 6px', fontSize: 9, letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>{m.icon}</span> {m.label}
          </button>
        ))}
      </div>

      {/* Duration + intensity */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {DURATION_OPTIONS.map(d => (
          <button key={d.ms} onClick={() => setSelDuration(d.ms)} style={{
            background: selDuration === d.ms ? `${C.orange}22` : 'transparent',
            border: `1px solid ${selDuration === d.ms ? C.orange : C.border}`,
            color: selDuration === d.ms ? C.orange : C.dim,
            padding: '3px 7px', fontSize: 9,
          }}>{d.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: C.dim, flexShrink: 0 }}>INTENSITY</div>
        <input type="range" min="0.1" max="1" step="0.1" value={intensity}
          onChange={e => setIntensity(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: meta.color }} />
        <div style={{ fontSize: 9, color: meta.color, width: 28 }}>{Math.round(intensity * 100)}%</div>
      </div>

      <button onClick={fire} style={{
        width: '100%', background: `${meta.color}22`,
        border: `1px solid ${meta.color}`, color: meta.color,
        padding: '8px', fontSize: 11, letterSpacing: 2,
        fontFamily: "'Bebas Neue', sans-serif",
        transition: 'background 0.15s',
      }}>
        INJECT {meta.label.toUpperCase()} → {region.name.toUpperCase()}
      </button>
    </div>
  )
}

// ── Nuclear card — all regions ────────────────────────────────────────────────
function NuclearCard({ onInject }) {
  const [selFault, setSelFault] = useState('booking_error')
  const meta = FAULT_META[selFault]

  function fire() {
    onInject({ type: selFault, scope: 'all', target: 'all', intensity: 1.0, durationMs: 60000 })
  }

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.red}44`, padding: 14 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 2, color: C.red }}>ALL REGIONS</div>
        <div style={{ fontSize: 9, color: C.dim }}>Systemic outage — every kiosk nationwide</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
        {Object.entries(FAULT_META).map(([key, m]) => (
          <button key={key} onClick={() => setSelFault(key)} style={{
            background: selFault === key ? `${m.color}22` : 'transparent',
            border: `1px solid ${selFault === key ? m.color : C.border}`,
            color: selFault === key ? m.color : C.dim,
            padding: '4px 6px', fontSize: 9, letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>{m.icon}</span> {m.label}
          </button>
        ))}
      </div>
      <button onClick={fire} style={{
        width: '100%', background: `${C.red}22`,
        border: `1px solid ${C.red}`, color: C.red,
        padding: '8px', fontSize: 11, letterSpacing: 2,
        fontFamily: "'Bebas Neue', sans-serif",
      }}>
        ⚡ NATIONWIDE OUTAGE
      </button>
    </div>
  )
}

// ── Region health badge ───────────────────────────────────────────────────────
function RegionHealth({ status }) {
  if (!status) return null
  const kiosks = status.stations.flatMap(s => s.kiosks)
  const withFaults = kiosks.filter(k => k.faults.length > 0).length
  const pct = kiosks.length ? Math.round((withFaults / kiosks.length) * 100) : 0
  const color = pct === 0 ? C.green : pct < 50 ? C.yellow : C.red

  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 16, fontFamily: "'Bebas Neue', sans-serif", color, letterSpacing: 1 }}>{100 - pct}%</div>
      <div style={{ fontSize: 8, color: C.dim }}>HEALTHY</div>
    </div>
  )
}

// ── Region panel with station drill-down ──────────────────────────────────────
function RegionPanel({ regionKey, region, status, onInject, activeFaults }) {
  const [expanded, setExpanded] = useState(false)

  if (!status) return null

  const kiosks     = status.stations.flatMap(s => s.kiosks)
  const faultyCount = kiosks.filter(k => k.faults.length > 0).length
  const totalJourneys = kiosks.reduce((s, k) => s + k.stats.journeys, 0)
  const totalErrors   = kiosks.reduce((s, k) => s + k.stats.errors, 0)
  const totalAds      = kiosks.reduce((s, k) => s + k.stats.adsMissed, 0)
  const errorRate     = totalJourneys ? Math.round((totalErrors / totalJourneys) * 100) : 0

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}` }}>
      {/* Header row */}
      <div className="row-hover" onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', gap: 16 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: 2, color: C.fg, width: 100 }}>{status.name}</div>
        <StatChip label="KIOSKS"    value={`${kiosks.length - faultyCount}/${kiosks.length}`} color={faultyCount > 0 ? C.yellow : C.green} />
        <StatChip label="JOURNEYS"  value={totalJourneys} color={C.blue} />
        <StatChip label="ERR RATE"  value={`${errorRate}%`} color={errorRate > 10 ? C.red : C.dim} />
        <StatChip label="ADS MISSED" value={totalAds} color={totalAds > 0 ? C.purple : C.dim} />
        <div style={{ marginLeft: 'auto', fontSize: 10, color: C.dim }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 14px' }}>
          {status.stations.map(station => (
            <StationRow key={station.id} station={station} onInject={onInject} regionKey={regionKey} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatChip({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 8, color: C.dim, letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: "'Bebas Neue', sans-serif", color, letterSpacing: 1 }}>{value}</div>
    </div>
  )
}

// ── Station row ───────────────────────────────────────────────────────────────
function StationRow({ station, onInject, regionKey }) {
  const [selFault, setSelFault] = useState('booking_error')
  const faultyKiosks = station.kiosks.filter(k => k.faults.length > 0)
  const meta = FAULT_META[selFault]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.border}22` }}>
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: C.fg }}>{station.name}</div>
        <div style={{ fontSize: 9, color: C.dim }}>{station.kiosks.length} kiosks</div>
      </div>

      {/* Kiosk indicators */}
      <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
        {station.kiosks.map(k => (
          <div key={k.id} title={`${k.id}\n${k.faults.join(', ') || 'healthy'}`}
            style={{ width: 12, height: 12, borderRadius: 2,
              background: k.faults.length > 0 ? FAULT_META[k.faults[0]]?.color || C.red : C.green,
              opacity: k.faults.length > 0 ? 1 : 0.5,
            }} />
        ))}
      </div>

      {/* Per-station fault inject */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        <select value={selFault} onChange={e => setSelFault(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: meta.color, fontSize: 9, padding: '3px 4px', fontFamily: 'inherit' }}>
          {Object.entries(FAULT_META).map(([k, m]) => (
            <option key={k} value={k}>{m.label}</option>
          ))}
        </select>
        <button onClick={() => onInject({ type: selFault, scope: 'station', target: station.id, intensity: 1.0, durationMs: 60000 })}
          style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}`, color: meta.color, padding: '3px 8px', fontSize: 9, letterSpacing: 1 }}>
          INJECT
        </button>
      </div>
    </div>
  )
}

// ── Custom fault builder ──────────────────────────────────────────────────────
function CustomFaultBuilder({ regions, onInject }) {
  const [type,      setType]      = useState('booking_error')
  const [scope,     setScope]     = useState('region')
  const [target,    setTarget]    = useState('ottawa')
  const [intensity, setIntensity] = useState(1.0)
  const [duration,  setDuration]  = useState(60000)

  const meta = FAULT_META[type]

  const targetOptions = scope === 'region'
    ? regions ? Object.entries(regions.regions).map(([k, v]) => ({ value: k, label: v.name })) : []
    : scope === 'station'
    ? regions ? Object.values(regions.regions).flatMap(r => r.stations.map(s => ({ value: s.id, label: s.name }))) : []
    : [{ value: 'all', label: 'All Kiosks' }]

  function fire() {
    const t = scope === 'all' ? 'all' : target
    onInject({ type, scope, target: t, intensity, durationMs: duration })
  }

  return (
    <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: C.orange, marginBottom: 10 }}>⚡ FAULT BUILDER</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Field label="FAULT TYPE">
          <select value={type} onChange={e => setType(e.target.value)}
            style={selectStyle(meta.color)}>
            {Object.entries(FAULT_META).map(([k, m]) => (
              <option key={k} value={k}>{m.icon} {m.label}</option>
            ))}
          </select>
        </Field>

        <Field label="SCOPE">
          <div style={{ display: 'flex', gap: 4 }}>
            {['region', 'station', 'all'].map(s => (
              <button key={s} onClick={() => { setScope(s); setTarget(s === 'all' ? 'all' : s === 'region' ? 'ottawa' : 'ott-central') }}
                style={{ flex: 1, background: scope === s ? `${C.orange}22` : 'transparent', border: `1px solid ${scope === s ? C.orange : C.border}`, color: scope === s ? C.orange : C.dim, padding: '4px 0', fontSize: 9, letterSpacing: 1 }}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </Field>

        {scope !== 'all' && (
          <Field label="TARGET">
            <select value={target} onChange={e => setTarget(e.target.value)} style={selectStyle(C.blue)}>
              {targetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        )}

        <Field label={`INTENSITY  ${Math.round(intensity * 100)}%`}>
          <input type="range" min="0.1" max="1" step="0.1" value={intensity}
            onChange={e => setIntensity(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: meta.color }} />
        </Field>

        <Field label="DURATION">
          <div style={{ display: 'flex', gap: 4 }}>
            {DURATION_OPTIONS.map(d => (
              <button key={d.ms} onClick={() => setDuration(d.ms)}
                style={{ flex: 1, background: duration === d.ms ? `${C.orange}22` : 'transparent', border: `1px solid ${duration === d.ms ? C.orange : C.border}`, color: duration === d.ms ? C.orange : C.dim, padding: '3px 0', fontSize: 9 }}>
                {d.label}
              </button>
            ))}
          </div>
        </Field>

        <div style={{ marginTop: 4, padding: '6px 8px', background: `${meta.color}11`, border: `1px solid ${meta.color}33`, fontSize: 9, color: C.dim }}>
          {meta.desc}
        </div>

        <button onClick={fire} style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}`, color: meta.color, padding: '10px', fontSize: 12, letterSpacing: 2, fontFamily: "'Bebas Neue', sans-serif" }}>
          INJECT FAULT →
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 8, color: C.dim, letterSpacing: 2, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

function selectStyle(color) {
  return { width: '100%', background: C.surface, border: `1px solid ${C.border}`, color, fontSize: 9, padding: '5px 6px', fontFamily: 'inherit' }
}

// ── Event log ─────────────────────────────────────────────────────────────────
function EventLog({ log }) {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: C.dim, marginBottom: 8 }}>EVENT LOG</div>
      {log.length === 0 && <div style={{ fontSize: 9, color: C.border }}>No events yet.</div>}
      {log.map((e, i) => (
        <div key={i} style={{ fontSize: 9, lineHeight: 1.7, borderBottom: `1px solid ${C.border}22`, paddingBottom: 2,
          color: e.level === 'error' ? C.red : e.level === 'warn' ? C.yellow : C.dim }}>
          <span style={{ color: C.border }}>{e.ts} </span>{e.msg}
        </div>
      ))}
    </div>
  )
}

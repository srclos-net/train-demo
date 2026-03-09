const FAULT_ITEMS = [
  { key: 'missingAds',   label: 'Missing Ads',        desc: 'Kills ad banner — revenue-critical' },
  { key: 'appLoadError', label: 'App Load Error',      desc: 'Simulates chunk load failure' },
  { key: 'bookingError', label: 'Booking Error',       desc: '503 on payment — booking fails' },
  { key: 'slowPerf',     label: 'Slow Performance',    desc: '5s delay + Faro perf alert' },
];

export default function FaultPanel({ faults, toggle }) {
  return (
    <div style={{ padding: 16, flex: 1, overflow: 'auto' }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: '#e94560', marginBottom: 12 }}>⚡ FAULT INJECTION</div>
      <div style={{ fontSize: 10, color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
        Toggle faults to demonstrate Faro detection. All faults emit real signals to your Grafana Cloud stack.
      </div>

      {FAULT_ITEMS.map(item => (
        <div key={item.key} className="fault-toggle">
          <div
            className={`toggle-track ${faults[item.key] ? 'on' : ''}`}
            onClick={() => toggle(item.key)}
            role="switch"
            aria-checked={faults[item.key]}
          >
            <div className="toggle-thumb" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: faults[item.key] ? '#e94560' : '#aaa', letterSpacing: 0.5 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 10, color: '#444', lineHeight: 1.4 }}>{item.desc}</div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20, padding: '10px 12px', background: 'rgba(82,183,136,0.05)', border: '1px solid rgba(82,183,136,0.15)', fontSize: 10, color: '#666', lineHeight: 1.8 }}>
        <div style={{ color: '#52b788', marginBottom: 6, letterSpacing: 1 }}>SENDING TO GRAFANA CLOUD</div>
        <div>→ faro.api.pushError()</div>
        <div>→ faro.api.pushLog()</div>
        <div>→ faro.api.pushMeasurement()</div>
        <div>→ faro.api.pushEvent()</div>
      </div>
    </div>
  );
}

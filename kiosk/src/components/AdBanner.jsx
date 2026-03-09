import { useState, useEffect, useRef } from 'react';
import { ADS } from '../data.js';
import { pushMeasurement, pushError, pushEvent } from '../faro.js';

export default function AdBanner({ disabled }) {
  const [index, setIndex] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (disabled) {
      clearInterval(timer.current);
      const err = new Error('AdService: Failed to fetch creative assets');
      pushError(err, { statusCode: 404, service: 'ad-creative-cdn' });
      pushEvent('ad_service_failure', { reason: 'missing_assets' });
      return;
    }

    timer.current = setInterval(() => {
      setIndex(i => {
        const next = (i + 1) % ADS.length;
        pushMeasurement('ad_impression', { slot: next, creative: ADS[next].tag });
        return next;
      });
    }, 4000);

    return () => clearInterval(timer.current);
  }, [disabled]);

  if (disabled) {
    return (
      <div style={{
        height: 80, background: '#0d0f1a',
        border: '1px dashed #2a2d3e',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <div className="pulse" style={{ width: 8, height: 8, background: '#e94560', borderRadius: '50%' }} />
        <div style={{ fontSize: 11, color: '#e94560', letterSpacing: 2 }}>
          AD SERVICE UNAVAILABLE — REVENUE IMPACT DETECTED
        </div>
      </div>
    );
  }

  const ad = ADS[index];
  return (
    <div className="ad-panel" key={index} style={{
      height: 80, background: ad.bg,
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: 24,
    }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: ad.accent, border: `1px solid ${ad.accent}`, padding: '2px 8px', flexShrink: 0 }}>
        {ad.tag}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 2, color: '#fff', flexShrink: 0 }}>
        {ad.headline}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1 }}>{ad.sub}</div>
      <button style={{
        background: 'transparent', border: `1px solid ${ad.accent}`, color: ad.accent,
        padding: '6px 16px', fontSize: 11, letterSpacing: 2, cursor: 'pointer',
        fontFamily: "'Bebas Neue', sans-serif", flexShrink: 0,
      }}>
        {ad.cta}
      </button>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {ADS.map((_, i) => (
          <div key={i} style={{
            width: i === index ? 16 : 4, height: 4,
            background: i === index ? ad.accent : 'rgba(255,255,255,0.2)',
            borderRadius: 2, transition: 'width 0.3s',
          }} />
        ))}
      </div>
    </div>
  );
}

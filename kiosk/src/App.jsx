import { useState, useEffect } from 'react';
import { pushLog, pushError, pushMeasurement, pushEvent } from './faro.js';
import AdBanner from './components/AdBanner.jsx';
import FaultPanel from './components/FaultPanel.jsx';
import {
  DepartureScreen,
  SeatScreen,
  ConfirmScreen,
  SuccessScreen,
  ErrorScreen,
  CrashScreen,
} from './components/Screens.jsx';

const DEFAULT_FAULTS = {
  missingAds:   false,
  appLoadError: false,
  bookingError: false,
  slowPerf:     false,
};

export default function App() {
  const [faults,      setFaults]      = useState(DEFAULT_FAULTS);
  const [screen,      setScreen]      = useState('departure');
  const [selected,    setSelected]    = useState(null);
  const [seatClass,   setSeatClass]   = useState('economy');
  const [loading,     setLoading]     = useState(false);
  const [bookingRef,  setBookingRef]  = useState(null);
  const [appCrashed,  setAppCrashed]  = useState(false);
  const [slowOverlay, setSlowOverlay] = useState(false);
  const [showFaults,  setShowFaults]  = useState(false);

  // ── app load error fault ──────────────────────────────────────────────────
  useEffect(() => {
    if (faults.appLoadError) {
      const err = new Error('ChunkLoadError: Failed to load module /static/js/booking.chunk.js');
      pushError(err, { fault: 'appLoadError', screen });
      setAppCrashed(true);
    } else {
      setAppCrashed(false);
    }
  }, [faults.appLoadError]);

  // ── slow perf fault ───────────────────────────────────────────────────────
  useEffect(() => {
    if (faults.slowPerf) {
      pushLog('Performance degraded: P95 response time 4800ms (threshold: 2000ms)', 'warn', {
        p95_ms: '4800',
        threshold_ms: '2000',
        fault: 'slowPerf',
      });
      pushMeasurement('response_time_p95', { value_ms: 4800 });
    }
  }, [faults.slowPerf]);

  // ── fault toggle ──────────────────────────────────────────────────────────
  function toggleFault(key) {
    setFaults(prev => {
      const next = { ...prev, [key]: !prev[key] };
      pushEvent('fault_toggled', { fault: key, enabled: String(next[key]) });
      return next;
    });
  }

  // ── booking flow ──────────────────────────────────────────────────────────
  async function handleBook() {
    if (!selected) return;

    const startTime = performance.now();
    pushEvent('booking_initiated', { trainId: selected.id, seatClass });

    if (faults.slowPerf) {
      setSlowOverlay(true);
      await new Promise(r => setTimeout(r, 5000));
      setSlowOverlay(false);
      const elapsed = Math.round(performance.now() - startTime);
      pushMeasurement('booking_request_duration', { value_ms: elapsed });
    }

    if (faults.bookingError) {
      const err = new Error('BookingAPI: 503 Service Unavailable — payment processor timeout');
      pushError(err, { trainId: selected.id, seatClass, statusCode: '503', service: 'payment-processor' });
      setScreen('error');
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));

    const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
    const elapsed = Math.round(performance.now() - startTime);

    pushMeasurement('booking_complete', { duration_ms: elapsed, price: seatClass === 'business' ? selected.price + 29 : selected.price });
    pushEvent('booking_confirmed', { trainId: selected.id, seatClass, ref });

    setBookingRef(ref);
    setLoading(false);
    setScreen('success');
  }

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: '#0a0e1a', minHeight: '100vh', color: '#e8eaf0', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* SLOW OVERLAY */}
      {slowOverlay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <div style={{ color: '#ffc83c', fontSize: 13, letterSpacing: 2 }}>PROCESSING — PLEASE WAIT</div>
          <div style={{ color: '#666', fontSize: 11 }}>Slow performance fault active</div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ background: '#080b14', borderBottom: '1px solid #1e2235', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3, color: '#ffc83c' }}>VIA RAIL</div>
          <div style={{ width: 1, height: 20, background: '#2a2d3e' }} />
          <div style={{ fontSize: 11, color: '#666', letterSpacing: 2 }}>SELF-SERVICE KIOSK</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, color: '#444' }}>
            Ottawa · Gare · {new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            className="btn-ghost"
            style={{
              fontSize: 11, padding: '5px 12px',
              borderColor: showFaults ? '#e94560' : '#333',
              color: showFaults ? '#e94560' : '#aaa',
            }}
            onClick={() => setShowFaults(v => !v)}
          >
            {showFaults ? '▲ CLOSE FAULTS' : '⚡ FAULT PANEL'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <AdBanner disabled={faults.missingAds} />

          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {appCrashed ? (
              <CrashScreen />
            ) : screen === 'departure' ? (
              <DepartureScreen
                selected={selected}
                onSelect={setSelected}
                onNext={() => setScreen('seat')}
              />
            ) : screen === 'seat' ? (
              <SeatScreen
                train={selected}
                seatClass={seatClass}
                onClass={setSeatClass}
                onBack={() => setScreen('departure')}
                onNext={() => setScreen('confirm')}
              />
            ) : screen === 'confirm' ? (
              <ConfirmScreen
                train={selected}
                seatClass={seatClass}
                loading={loading}
                onBack={() => setScreen('seat')}
                onConfirm={handleBook}
              />
            ) : screen === 'success' ? (
              <SuccessScreen
                train={selected}
                seatClass={seatClass}
                bookingRef={bookingRef}
                onReset={() => { setSelected(null); setSeatClass('economy'); setScreen('departure'); }}
              />
            ) : screen === 'error' ? (
              <ErrorScreen
                onRetry={() => setScreen('confirm')}
                onReset={() => { setSelected(null); setSeatClass('economy'); setScreen('departure'); }}
              />
            ) : null}
          </div>
        </div>

        {/* FAULT PANEL (conditionally shown) */}
        {showFaults && (
          <div style={{ width: 260, background: '#080b14', borderLeft: '1px solid #1e2235', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <FaultPanel faults={faults} toggle={toggleFault} />
          </div>
        )}
      </div>
    </div>
  );
}

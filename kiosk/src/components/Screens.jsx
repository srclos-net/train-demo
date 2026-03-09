import { useEffect } from 'react';
import { pushLog, pushEvent } from '../faro.js';
import { TRAINS } from '../data.js';

// ─── DEPARTURE ───────────────────────────────────────────────────────────────
export function DepartureScreen({ selected, onSelect, onNext }) {
  useEffect(() => {
    pushLog('Screen loaded: departures');
    pushEvent('screen_view', { screen: 'departure' });
  }, []);

  return (
    <div className="screen">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#666', letterSpacing: 3, marginBottom: 4 }}>STEP 1 OF 3</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 3 }}>SELECT DEPARTURE</div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
          Ottawa — Today, {new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr 100px 80px 60px 80px',
        gap: 8, padding: '8px 12px',
        fontSize: 9, color: '#444', letterSpacing: 2,
        borderBottom: '1px solid #1e2235', marginBottom: 4,
      }}>
        <div>TRAIN</div><div>DESTINATION</div><div>DEPARTS</div><div>ARRIVES</div><div>TRACK</div><div>SEATS</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 20 }}>
        {TRAINS.map(t => {
          const soldOut = t.seats === 0;
          const isSelected = selected?.id === t.id;
          return (
            <div
              key={t.id}
              className={`train-row ${isSelected ? 'selected' : ''}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 100px 80px 60px 80px',
                gap: 8, padding: '12px 12px',
                border: '1px solid transparent',
                cursor: soldOut ? 'not-allowed' : 'pointer',
                opacity: soldOut ? 0.4 : 1,
              }}
              onClick={() => {
                if (!soldOut) {
                  onSelect(t);
                  pushEvent('train_selected', { trainId: t.id, destination: t.to, price: t.price });
                }
              }}
            >
              <div style={{ fontSize: 12, color: '#ffc83c', letterSpacing: 1 }}>{t.id}</div>
              <div>
                <div style={{ fontSize: 14, color: '#e8eaf0' }}>{t.to}</div>
                <div style={{ fontSize: 10, color: '#555' }}>{t.from}</div>
              </div>
              <div style={{ fontSize: 16, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2, color: '#fff' }}>{t.departs}</div>
              <div style={{ fontSize: 14, color: '#aaa' }}>{t.arrives}</div>
              <div style={{ fontSize: 14, color: '#aaa' }}>{t.track}</div>
              <div style={{ textAlign: 'right' }}>
                {soldOut
                  ? <span className="status-badge badge-err">SOLD OUT</span>
                  : t.seats <= 8
                    ? <span className="status-badge badge-warn">{t.seats} LEFT</span>
                    : <span style={{ fontSize: 12, color: '#555' }}>{t.seats}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" disabled={!selected} onClick={onNext}>
          SELECT SEAT CLASS →
        </button>
      </div>
    </div>
  );
}

// ─── SEAT ────────────────────────────────────────────────────────────────────
export function SeatScreen({ train, seatClass, onClass, onBack, onNext }) {
  useEffect(() => {
    pushEvent('screen_view', { screen: 'seat_selection', trainId: train.id });
  }, []);

  const classes = [
    { id: 'economy',  label: 'Economy',  price: train.price,      desc: 'Standard seating, power outlets at select seats' },
    { id: 'business', label: 'Business', price: train.price + 29, desc: 'Wide seats, Wi-Fi, meal service, quiet car' },
  ];

  return (
    <div className="screen">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#666', letterSpacing: 3, marginBottom: 4 }}>STEP 2 OF 3</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 3 }}>SELECT CLASS</div>
        <div style={{ fontSize: 12, color: '#555' }}>{train.id} · Ottawa → {train.to} · {train.departs}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, maxWidth: 500 }}>
        {classes.map(c => (
          <div
            key={c.id}
            className={`seat-option ${seatClass === c.id ? 'selected' : ''}`}
            onClick={() => {
              onClass(c.id);
              pushEvent('class_selected', { class: c.id, price: c.price });
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 2, color: seatClass === c.id ? '#ffc83c' : '#fff' }}>
                {c.label}
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#ffc83c' }}>${c.price}</div>
            </div>
            <div style={{ fontSize: 11, color: '#666' }}>{c.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-ghost" onClick={onBack}>← BACK</button>
        <button className="btn-primary" onClick={onNext}>REVIEW & PAY →</button>
      </div>
    </div>
  );
}

// ─── CONFIRM ─────────────────────────────────────────────────────────────────
export function ConfirmScreen({ train, seatClass, loading, onBack, onConfirm }) {
  const price = seatClass === 'business' ? train.price + 29 : train.price;

  useEffect(() => {
    pushEvent('screen_view', { screen: 'confirm', trainId: train.id, seatClass, price });
  }, []);

  const rows = [
    ['Train',   train.id],
    ['Route',   `Ottawa → ${train.to}`],
    ['Departs', `${train.departs} · Track ${train.track}`],
    ['Class',   seatClass.charAt(0).toUpperCase() + seatClass.slice(1)],
    ['Total',   `$${price} CAD`],
  ];

  return (
    <div className="screen">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#666', letterSpacing: 3, marginBottom: 4 }}>STEP 3 OF 3</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 3 }}>CONFIRM BOOKING</div>
      </div>

      <div style={{ background: '#0d1020', border: '1px solid #1e2235', padding: 20, maxWidth: 480, marginBottom: 24 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1d2e' }}>
            <div style={{ fontSize: 11, color: '#555', letterSpacing: 2 }}>{k}</div>
            <div style={{
              fontSize:      k === 'Total' ? 20 : 14,
              fontFamily:    k === 'Total' ? "'Bebas Neue', sans-serif" : 'inherit',
              color:         k === 'Total' ? '#ffc83c' : '#e8eaf0',
              letterSpacing: k === 'Total' ? 2 : 0,
            }}>
              {v}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-ghost" onClick={onBack} disabled={loading}>← BACK</button>
        <button className="btn-primary" onClick={onConfirm} disabled={loading}
          style={{ minWidth: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {loading ? <><div className="spinner" /> PROCESSING</> : 'PAY & CONFIRM →'}
        </button>
      </div>
    </div>
  );
}

// ─── SUCCESS ─────────────────────────────────────────────────────────────────
export function SuccessScreen({ train, seatClass, bookingRef, onReset }) {
  useEffect(() => {
    pushEvent('booking_success', { trainId: train.id, seatClass, ref: bookingRef });
  }, []);

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center' }}>
      <div style={{ width: 60, height: 60, border: '2px solid #52b788', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#52b788' }}>✓</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, letterSpacing: 4, color: '#52b788' }}>BOOKING CONFIRMED</div>
      <div style={{ fontSize: 13, color: '#888' }}>
        Your ticket has been emailed. Reference: <span style={{ color: '#ffc83c', letterSpacing: 2 }}>{bookingRef}</span>
      </div>
      <div style={{ fontSize: 11, color: '#555' }}>{train.id} · Ottawa → {train.to} · {train.departs} · {seatClass}</div>
      <div style={{ marginTop: 16 }}>
        <button className="btn-primary" onClick={onReset}>NEW BOOKING</button>
      </div>
    </div>
  );
}

// ─── ERROR ───────────────────────────────────────────────────────────────────
export function ErrorScreen({ onRetry, onReset }) {
  useEffect(() => {
    pushEvent('screen_view', { screen: 'booking_error' });
  }, []);

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center' }}>
      <div style={{ width: 60, height: 60, border: '2px solid #e94560', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#e94560' }}>✕</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, letterSpacing: 4, color: '#e94560' }}>BOOKING FAILED</div>
      <div style={{ fontSize: 13, color: '#888', maxWidth: 360 }}>
        Unable to process payment. Our booking service is temporarily unavailable (503). Please try again or see station staff.
      </div>
      <div style={{ fontSize: 10, color: '#e94560', background: 'rgba(233,69,96,0.1)', padding: '6px 14px', letterSpacing: 1 }}>
        ERROR REPORTED TO GRAFANA CLOUD · INCIDENT CREATED
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button className="btn-ghost" onClick={onReset}>START OVER</button>
        <button className="btn-primary" onClick={onRetry}>RETRY →</button>
      </div>
    </div>
  );
}

// ─── CRASH ───────────────────────────────────────────────────────────────────
export function CrashScreen() {
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
      <div style={{ fontSize: 48, fontFamily: "'Bebas Neue', sans-serif", color: '#e94560', letterSpacing: 4 }}>APPLICATION ERROR</div>
      <div style={{ fontSize: 13, color: '#888', maxWidth: 400, textAlign: 'center' }}>
        ChunkLoadError: Failed to load required module. Please contact station staff or try another kiosk.
      </div>
      <div style={{ fontSize: 10, color: '#e94560', background: 'rgba(233,69,96,0.1)', padding: '8px 16px', letterSpacing: 1 }}>
        ERROR REPORTED TO GRAFANA CLOUD
      </div>
    </div>
  );
}

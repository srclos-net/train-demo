import { useState } from 'react';
import { pushMeasurement, pushError, pushEvent } from './faro.js';
import AdBanner from './components/AdBanner.jsx';
import {
  DepartureScreen,
  SeatScreen,
  ConfirmScreen,
  SuccessScreen,
  ErrorScreen,
} from './components/Screens.jsx';

export default function App() {
  const [screen, setScreen] = useState('departure');
  const [selected, setSelected] = useState(null);
  const [seatClass, setSeatClass] = useState('economy');
  const [loading, setLoading] = useState(false);
  const [bookingRef, setBookingRef] = useState(null);

  async function handleBook() {
    if (!selected) return;

    const startTime = performance.now();
    pushEvent('booking_initiated', { trainId: selected.id, seatClass });

    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1400));

      const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
      const elapsed = Math.round(performance.now() - startTime);

      pushMeasurement('booking_complete', { duration_ms: elapsed, price: seatClass === 'business' ? selected.price + 29 : selected.price });
      pushEvent('booking_confirmed', { trainId: selected.id, seatClass, ref });

      setBookingRef(ref);
      setScreen('success');
    } catch (err) {
      pushError(err, { trainId: selected.id, seatClass });
      setScreen('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: '#0a0e1a', minHeight: '100vh', color: '#e8eaf0', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

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
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: 24 }}>
          <AdBanner />
          {screen === 'departure' ? (
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
    </div>
  );
}

import { v4 as uuidv4 } from 'uuid';
import { sendLog, sendError, sendEvent, sendMeasurement } from './faroClient.js';
import { TRAINS } from './data.js';

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function jitter(base, factor = 0.3) {
  return base + (Math.random() - 0.5) * base * factor;
}

export class VirtualKiosk {
  constructor({ id, stationId, stationName, region, regionName }) {
    this.id          = id;
    this.stationId   = stationId;
    this.stationName = stationName;
    this.region      = region;
    this.regionName  = regionName;
    this.sessionId   = uuidv4();
    this.currentUserId = uuidv4();
    this.running     = false;
    this.faults      = new Set();
    this.stats       = { journeys: 0, successes: 0, errors: 0, adsMissed: 0 };
  }

  setFault(fault, active) {
    if (active) {
      this.faults.add(fault);
    } else {
      this.faults.delete(fault);
    }
  }

  hasFault(fault) { return this.faults.has(fault); }

  async start() {
    this.running = true;
    console.log(`[kiosk] ${this.id} (${this.stationName}) started`);
    while (this.running) {
      try {
        await this.runJourney();
      } catch (err) {
        console.error(`[kiosk] ${this.id} journey error:`, err.message);
      }
      // Wait between journeys — simulates kiosk idle time
      await sleep(jitter(8000));
    }
  }

  stop() {
    this.running = false;
  }

  // ── A full user journey ──────────────────────────────────────────────────

  async runJourney() {
    // Fresh session per journey (new user walks up)
    this.sessionId   = uuidv4();
    this.currentUserId = uuidv4();
    this.stats.journeys++;

    // App load error — fires and exits journey
    if (this.hasFault('app_crash')) {
      await sendError(
        this,
        'ChunkLoadError: Failed to load module /static/js/booking.chunk.js',
        'ChunkLoadError',
        { fault: 'app_crash' }
      );
      this.stats.errors++;
      await sleep(jitter(2000));
      return;
    }

    // Screen view: departures
    await sendEvent(this, 'screen_view', { screen: 'departure' });
    await sleep(jitter(3000)); // user browses

    // Ad impression (or miss)
    if (this.hasFault('missing_ads')) {
      await sendError(
        this,
        'AdService: Failed to fetch creative assets',
        'AdServiceError',
        { statusCode: '404', fault: 'missing_ads' }
      );
      this.stats.adsMissed++;
    } else {
      const adSlot = Math.floor(Math.random() * 4);
      await sendMeasurement(this, 'ad_impression', { slot: adSlot });
    }

    // Select train
    const train = randomItem(TRAINS);
    await sendEvent(this, 'train_selected', {
      train_id:    train.id,
      destination: train.to,
      price:       String(train.price),
    });
    await sleep(jitter(2000));

    // Select class
    const seatClass = Math.random() > 0.7 ? 'business' : 'economy';
    const price = seatClass === 'business' ? train.price + 29 : train.price;
    await sendEvent(this, 'class_selected', { class: seatClass, price: String(price) });
    await sleep(jitter(1500));

    // Screen view: confirm
    await sendEvent(this, 'screen_view', { screen: 'confirm', train_id: train.id });
    await sleep(jitter(2000));

    // Booking attempt
    const startTs = Date.now();
    await sendEvent(this, 'booking_initiated', { train_id: train.id, class: seatClass });

    if (this.hasFault('slow_perf')) {
      const delay = jitter(5000, 0.2);
      await sleep(delay);
      await sendMeasurement(this, 'booking_request_duration', { value_ms: Math.round(delay) });
      await sendLog(this, 'warn',
        `Performance degraded: booking took ${Math.round(delay)}ms`,
        { threshold_ms: '2000', fault: 'slow_perf' }
      );
    }

    if (this.hasFault('booking_error')) {
      await sendError(
        this,
        'BookingAPI: 503 Service Unavailable — payment processor timeout',
        'BookingAPIError',
        { statusCode: '503', train_id: train.id, fault: 'booking_error' }
      );
      await sendEvent(this, 'screen_view', { screen: 'booking_error' });
      this.stats.errors++;
      await sleep(jitter(1000));
      return;
    }

    // Success
    const duration = Date.now() - startTs;
    const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
    await sendMeasurement(this, 'booking_complete', {
      duration_ms: duration,
      price,
    });
    await sendEvent(this, 'booking_confirmed', {
      train_id:  train.id,
      class:     seatClass,
      ref,
      price:     String(price),
    });
    this.stats.successes++;
  }
}

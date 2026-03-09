import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const COLLECTOR_URL = process.env.FARO_COLLECTOR_URL ||
  'https://faro-collector-prod-ca-east-0.grafana.net/collect/761f498fabfa4e1df5a556870caf81c0';

const APP = {
  name:        'trainstation-kiosk',
  version:     '1.0.0',
  environment: 'production',
};

function ts() {
  return new Date().toISOString();
}

function buildMeta(kiosk) {
  return {
    app: APP,
    session: {
      id: kiosk.sessionId,
      attributes: {
        kiosk_id:    kiosk.id,
        station:     kiosk.stationName,
        region:      kiosk.region,
        region_name: kiosk.regionName,
        simulated:   'true',
      },
    },
    user: {
      id:         kiosk.currentUserId,
      attributes: { type: 'simulated' },
    },
    sdk: {
      name:    'faro-web-sdk',
      version: '1.0.0',
    },
    page: { url: 'http://kiosk.via-rail.demo/' },
  };
}

async function send(kiosk, body) {
  try {
    const payload = JSON.stringify({ ...body, meta: buildMeta(kiosk) });
    const res = await fetch(COLLECTOR_URL, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'X-Faro-Session-Id': kiosk.sessionId,
      },
      body: payload,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[faro] send failed: ${res.status} ${res.statusText} — ${text.slice(0, 120)}`);
    }
  } catch (err) {
    console.error('[faro] network error:', err.message);
  }
}

export async function sendLog(kiosk, level, message, context = {}) {
  await send(kiosk, {
    logs: [{
      message,
      level,
      context: { ...context, kiosk_id: kiosk.id, station: kiosk.stationName, region: kiosk.region },
      timestamp: ts(),
    }],
  });
}

export async function sendError(kiosk, message, type = 'Error', context = {}) {
  await send(kiosk, {
    exceptions: [{
      type,
      value: message,
      stacktrace: {
        frames: [
          { filename: '/assets/index-D9Bx_reG.js', lineno: 103, colno: 106019, function: '?' },
          { filename: '/assets/index-D9Bx_reG.js', lineno: 40,  colno: 24217,  function: 'ja' },
        ],
      },
      context: { ...context, kiosk_id: kiosk.id, station: kiosk.stationName, region: kiosk.region },
      timestamp: ts(),
    }],
  });
}

export async function sendEvent(kiosk, name, attributes = {}) {
  await send(kiosk, {
    events: [{
      name,
      attributes: {
        ...attributes,
        kiosk_id:    kiosk.id,
        station:     kiosk.stationName,
        region:      kiosk.region,
        region_name: kiosk.regionName,
      },
      timestamp: ts(),
    }],
  });
}

export async function sendMeasurement(kiosk, type, values) {
  await send(kiosk, {
    measurements: [{
      type,
      values,
      context: { kiosk_id: kiosk.id, station: kiosk.stationName, region: kiosk.region },
      timestamp: ts(),
    }],
  });
}
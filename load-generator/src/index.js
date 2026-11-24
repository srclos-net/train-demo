import express from 'express';
import cors from 'cors';
import { REGIONS, FAULT_TYPES } from './data.js';
import { VirtualKiosk } from './kiosk.js';
import { FaultManager } from './faultManager.js';
import { createBackendFaultsRouter } from './backendFaults.js';

const PORT = process.env.PORT || 3001;

// ── Build kiosk pool ──────────────────────────────────────────────────────────
const kioskMap = new Map();

for (const [regionKey, region] of Object.entries(REGIONS)) {
  for (const station of region.stations) {
    for (let i = 0; i < station.kiosks; i++) {
      const id = `${station.id}-k${i + 1}`;
      const kiosk = new VirtualKiosk({
        id,
        stationId:   station.id,
        stationName: station.name,
        region:      regionKey,
        regionName:  region.name,
      });
      kioskMap.set(id, kiosk);
    }
  }
}

console.log(`[init] ${kioskMap.size} virtual kiosks created`);

const faultManager = new FaultManager(kioskMap);

// ── Start all kiosks ──────────────────────────────────────────────────────────
// Stagger startup so we don't hammer the collector at t=0
let delay = 0;
for (const kiosk of kioskMap.values()) {
  setTimeout(() => kiosk.start(), delay);
  delay += 300;
}

// ── Express API ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// GET /status — overall health + per-region stats
app.get('/status', (req, res) => {
  const regions = {};
  for (const [regionKey, region] of Object.entries(REGIONS)) {
    const kiosks = [...kioskMap.values()].filter(k => k.region === regionKey);
    regions[regionKey] = {
      name:      region.name,
      kiosks:    kiosks.length,
      stations:  region.stations.map(s => ({
        id:      s.id,
        name:    s.name,
        kiosks:  [...kioskMap.values()].filter(k => k.stationId === s.id).map(k => ({
          id:        k.id,
          faults:    [...k.faults],
          stats:     k.stats,
          running:   k.running,
        })),
      })),
    };
  }

  res.json({
    totalKiosks:  kioskMap.size,
    activeFaults: faultManager.activeFaults(),
    regions,
  });
});

// GET /regions — metadata only (for UI to build controls)
app.get('/regions', (req, res) => {
  const out = {};
  for (const [key, region] of Object.entries(REGIONS)) {
    out[key] = {
      name:     region.name,
      stations: region.stations.map(s => ({
        id:     s.id,
        name:   s.name,
        kiosks: s.kiosks,
      })),
    };
  }
  res.json({ regions: out, faultTypes: FAULT_TYPES });
});

// GET /faults — active faults
app.get('/faults', (req, res) => {
  res.json({ faults: faultManager.activeFaults() });
});

// POST /fault/inject
// Body: { type, scope, target, intensity, durationMs }
app.post('/fault/inject', (req, res) => {
  const { type, scope, target, intensity = 1.0, durationMs = 60000 } = req.body;

  if (!FAULT_TYPES.includes(type)) {
    return res.status(400).json({ error: `Unknown fault type: ${type}` });
  }
  if (!['region', 'station', 'all'].includes(scope)) {
    return res.status(400).json({ error: `Invalid scope: ${scope}` });
  }

  const fault = faultManager.inject({ type, scope, target, intensity, durationMs });
  res.json({ ok: true, fault });
});

// POST /fault/clear
// Body: { faultId } or { type, scope, target } to clear by match
app.post('/fault/clear', (req, res) => {
  const { faultId } = req.body;
  if (faultId) {
    faultManager.clear(faultId);
    return res.json({ ok: true });
  }
  res.status(400).json({ error: 'faultId required' });
});

// POST /fault/clear-all
app.post('/fault/clear-all', (req, res) => {
  faultManager.clearAll();
  res.json({ ok: true });
});

// /backend-faults — relay to the real via-trains booking-service fault API
app.use(createBackendFaultsRouter(process.env.BOOKING_SERVICE_URL || 'http://host.docker.internal:5080'));

app.listen(PORT, () => {
  console.log(`[api] Load generator API listening on :${PORT}`);
  console.log(`[api] Kiosks: ${kioskMap.size} | Regions: ${Object.keys(REGIONS).join(', ')}`);
});

# VIA Rail Kiosk — Grafana Faro Demo

Full-stack demo for Grafana Cloud Frontend Observability. Three services:

| Service | Port | Purpose |
|---------|------|---------|
| `kiosk` | 8080 | The React train booking app |
| `load-generator` | 3001 | Node.js engine — 28 virtual kiosks across 3 regions sending real Faro signals |
| `load-ui` | 8081 | React control panel — inject/clear regional faults in realtime |

## Quick Start

```bash
cp .env.example .env
# edit .env — set FARO_COLLECTOR_URL if different from default

docker compose up --build
```

Then open:
- **http://localhost:8080** — kiosk app
- **http://localhost:8081** — load control UI (regional faults + via-trains backend fault control)

## Architecture

```
Grafana Cloud
└── Faro Collector ◄─────────────────────────────────────┐
                                                          │
┌─────────────────────────────────────────────────────┐  │
│  load-generator (Node.js)                           │  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │  │
│  │ Ottawa       │  │ Toronto      │  │ Montréal │  │──┘
│  │ 9 kiosks     │  │ 10 kiosks    │  │ 9 kiosks │  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
│  Exposes REST API: /fault/inject, /status, etc.     │
└───────────────────────┬─────────────────────────────┘
                        │ /api proxy
┌───────────────────────▼─────────────────────────────┐
│  load-ui (React)                                    │
│  - Quick scenario cards per region                  │
│  - Per-station kiosk health grid                    │
│  - Custom fault builder (scope/intensity/duration)  │
│  - Active fault pills with countdown                │
└─────────────────────────────────────────────────────┘
```

## Regions & Stations

| Region | Stations | Kiosks |
|--------|----------|--------|
| Ottawa | Gare Centrale, Rideau, Airport Connector | 9 |
| Toronto | Union Station, Bloor, Yorkdale | 10 |
| Montréal | Gare Centrale, Vendôme, Anjou | 9 |

## Fault Types

| Fault | Faro Signal | Demo Story |
|-------|-------------|------------|
| `booking_error` | `pushError` 503 | Payment processor down — conversion drops |
| `slow_perf` | `pushMeasurement` P95 + `pushLog` warn | Latency spike — users abandoning |
| `missing_ads` | `pushError` 404 | Ad CDN failure — revenue impact visible |
| `app_crash` | `pushError` ChunkLoadError | Deploy gone wrong — kiosks unresponsive |

## Demo Flow

1. Open load-ui, confirm all kiosks healthy (green)
2. Show Grafana Cloud — baseline traffic flowing
3. Inject `booking_error` on Ottawa region — watch error rate spike on Ottawa only
4. Show Grafana Cloud — regional pattern visible in sessions/errors
5. Clear Ottawa, inject nationwide `missing_ads` — all regions go purple
6. Show revenue impact story in Grafana
7. Clear all — watch metrics recover

## Sourcemap Upload

```bash
cd kiosk
FARO_API_KEY=your-key npm run build
# sourcemaps auto-uploaded via @grafana/faro-rollup-plugin
```

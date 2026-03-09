# trainstation-kiosk

Faro demo app for Grafana Cloud. React + Vite with real `@grafana/faro-react` instrumentation.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build & Deploy

```bash
npm run build
# dist/ is ready to serve — drop it behind nginx or deploy to Vercel/Netlify
```

## What's instrumented

| Signal | When |
|--------|------|
| `pushEvent('screen_view')` | Every screen transition |
| `pushEvent('train_selected')` | User picks a train |
| `pushEvent('class_selected')` | Economy / Business toggle |
| `pushEvent('booking_initiated')` | Confirm button pressed |
| `pushEvent('booking_confirmed')` | Success |
| `pushEvent('booking_success')` | Success screen mount |
| `pushEvent('fault_toggled')` | Demo fault panel |
| `pushMeasurement('ad_impression')` | Each ad rotation |
| `pushMeasurement('booking_complete')` | Includes duration_ms + price |
| `pushMeasurement('booking_request_duration')` | Slow-perf fault timing |
| `pushMeasurement('response_time_p95')` | Slow-perf fault alert |
| `pushError(...)` | App load error, booking 503, ad 404 |
| Web Vitals (LCP, CLS, FID) | Automatic via `getWebInstrumentations()` |
| JS errors / unhandled rejections | Automatic |
| Navigation / route changes | Automatic via `ReactIntegration` |
| HTTP traces (fetch/XHR) | Automatic via `TracingInstrumentation` |

## Fault Injection

Click **⚡ FAULT PANEL** in the top-right corner:

- **Missing Ads** — fires `pushError` with 404 context, kills ad banner
- **App Load Error** — fires `pushError` ChunkLoadError, crashes booking UI
- **Booking Error** — fires `pushError` 503, routes to error screen
- **Slow Performance** — 5s booking delay, fires P95 measurement + log warning

## Grafana Cloud Collector

```
https://faro-collector-prod-ca-east-0.grafana.net/collect/761f498fabfa4e1df5a556870caf81c0
```

App name: `trainstation-kiosk` / environment: `production`

# Backend Fault Control in load-ui / Clean Kiosk

Date: 2026-11-23
Status: Approved approach, design pending sign-off

## Intent & why

The kiosk front end currently ships a cosmetic "⚡ FAULT PANEL" (client-side
toggles that push fake Faro signals). Two problems:

1. It leaks fault-injection machinery into the customer-facing app. The kiosk
   is driven by AI personas that must see a plain booking app — fault toggles
   in the UI confuse them.
2. The *real* fault engine (via-trains `booking-service` `/api/faults` API,
   mirrored by ad/payment service pollers) has no UI at all.

Goal: remove fault UI from the kiosk entirely, and drive the real `/api/faults`
API from the existing `load-ui` control site, so fault injection lives in
exactly one place.

## Goals

- Kiosk renders zero fault-injection UI or behavior (no panel, no toggles, no
  fault special-cases in the booking flow, no slow overlay).
- `load-ui` gains a "Backend Faults" section with three toggle rows — Slow DB,
  Booking Failure, Pool Exhaustion — that enable/disable the real
  `booking-service` fault modes (`slow_db`, `booking_failure`,
  `pool_exhaustion`).
- Works in local `docker compose` out of the box; k8s-ready via env var.
- `via-trains` repo: **no changes**.

## Non-goals / anti-goals

- No per-region or per-kiosk backend faults (the backend engine is global by
  design — don't fake per-kiosk scope).
- No new standalone control site.
- No ingress or new public endpoints: the relay lives inside the existing
  `load-generator`, reached only via `load-ui`'s `/api` proxy (same as today).
- Not porting the cosmetic Faro faults (they were scaffolding; real backend
  faults produce real Faro signals from the kiosk).

## Constraints

- `load-ui` keeps its single-backend model: nginx proxies `/api/*` to
  `load-generator` only (nginx.conf unchanged).
- The relay is a plain forwarder: `GET /backend-faults`,
  `POST /backend-faults/:mode`, `DELETE /backend-faults/:mode` →
  `BOOKING_SERVICE_URL` + `/api/faults[...]`. If booking-service is
  unreachable, report a clear error (don't crash, don't hide the state).
- Backend faults are global: the UI must say so (label/copy), distinct from
  the existing regional fault section.

## Approaches considered

1. **Relay through load-generator** — chosen. One new small endpoint group;
   `load-ui`'s one-backend model and nginx stay intact; local vs k8s differs
   only by an env var (`BOOKING_SERVICE_URL`).
2. Second nginx `location` proxying directly to booking-service — more moving
   parts, and local compose needs cross-network reachability in nginx.
3. Expose booking-service to browsers (ingress) — leaves an unauthenticated
   fault-control endpoint public; rejected.

## Design

### Kiosk cleanup (`kiosk/`)

- Delete `src/components/FaultPanel.jsx`.
- `src/App.jsx`: remove the `faults` state + `DEFAULT_FAULTS`, the
  `showFaults` state and the "⚡ FAULT PANEL" button, the slow overlay, the
  `faults.appLoadError` / `faults.slowPerf` effects, and the `slowPerf` /
  `bookingError` special-cases in `handleBook`. `handleBook` becomes the
  plain flow. `AdBanner` is always enabled (drop the `disabled` prop wiring).
- Verify: kiosk builds; no `fault` references remain in `kiosk/src`; a persona
  walking the app sees Home → select → book → confirm, with no fault surface.
- `README.md` (train-demo root): kiosk description drops "with fault
  injection"; load-ui description mentions it also drives backend faults.

### load-generator relay (`load-generator/`)

- `src/backendFaults.js` (small module, mounted in `src/index.js`): express
  routes forwarding to `BOOKING_SERVICE_URL` (default
  `http://host.docker.internal:5080`). Uses `fetch` (Node 18+; image is
  node:20). Maps failures to `502 { error: "booking-service unreachable" }`.
- `docker-compose.yml`: add `BOOKING_SERVICE_URL` env to load-generator with
  a commented note for the k8s value (in-cluster service DNS).

### load-ui section (`load-ui/`)

- New component `src/components/BackendFaults.jsx`: three toggle rows —
  Slow DB / Booking Failure / Pool Exhaustion — each calling
  `apiFetch('/backend-faults/:mode', POST|DELETE)`; active set polled from
  `GET /backend-faults` on the same interval the UI already uses for status.
  Renders a "global — affects all kiosks" note and a disconnected state when
  booking-service is unreachable.
- `App.jsx`: mount it alongside the existing regional-fault UI.

## What's left to the builder

- Exact component styling to match the existing load-ui aesthetic.
- Poll interval for backend fault state (suggest same as existing status poll).

# Backend Fault Control in load-ui / Clean Kiosk — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all fault-injection UI/behavior from the customer kiosk and drive the real via-trains `booking-service` fault API from the load-ui control site via a relay inside load-generator.

**Architecture:** load-ui renders a new "Backend Faults" section; its existing nginx `/api` proxy forwards to load-generator, which gains a small express relay (`GET/POST/DELETE /backend-faults[/:mode]`) forwarding to `BOOKING_SERVICE_URL/api/faults[...]`. The kiosk is stripped to a plain booking app.

**Tech Stack:** React 18 + Vite (kiosk, load-ui), Express 4 + Node 20 global fetch (load-generator), docker-compose, `node --test` (no new dependencies).

**Spec:** `docs/superpowers/specs/2026-11-23-backend-fault-control-design.md`

## Global Constraints

- `via-trains` repo: **ZERO changes** (its `/api/faults` API already works).
- load-ui keeps its single-backend model: nginx proxies `/api/*` to load-generator only; `load-ui/nginx.conf` is **not** changed.
- No new ingress or public endpoints; the relay is reachable only through load-ui's existing `/api` proxy.
- Relay is a plain forwarder. If booking-service is unreachable: respond `502 { "error": "booking-service unreachable" }` — no crash, no hang.
- `BOOKING_SERVICE_URL` env on load-generator, default `http://host.docker.internal:5080` (local compose). k8s value = in-cluster service DNS (comment in compose file).
- Backend faults are global; the UI must say so ("global — affects all kiosks"), visually distinct from the existing regional fault section.
- No new npm dependencies in any service.
- Every commit message ends with: `Co-Authored-By: Claude Code <noreply@anthropic.com>`

## Review Focus

1. **Unknown fault mode** — `POST /backend-faults/bogus`: relay must not 500 or buffer; booking-service's own 4xx passes through with its status and body.
2. **booking-service down** — every relay route returns `502 { "error": "booking-service unreachable" }`; load-generator keeps serving `/status` normally.
3. **Kiosk dead-refs** — after cleanup, no `fault` identifier (case-insensitive) remains in `kiosk/src`; `AdBanner` renders with no props and the booking flow still completes Home → select → book → confirm.
4. **load-ui disconnected state** — while load-generator is up but booking-service is down, the Backend Faults section shows a disconnected state (not an error overlay that blanks the whole page, not an infinite spinner).
5. **Poll stability** — the 3000ms poll of `GET /backend-faults` never throws unhandled into React state on non-JSON responses.

---

### Task 1: Kiosk cleanup — zero fault UI

**Files:**
- Delete: `kiosk/src/components/FaultPanel.jsx`
- Modify: `kiosk/src/App.jsx` (fault refs at lines 4, 14–18, 22, 29–30, 32–41, 43–53, 55–69, 71–83, 103–110, 127–133, 142, 185–189 — re-read before editing)
- Modify: `README.md` (repo root)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: a kiosk with no fault surface; `<AdBanner />` used prop-free.

- [ ] **Step 1: Read the current files in full** — `kiosk/src/App.jsx`, `kiosk/src/components/FaultPanel.jsx`, `kiosk/src/components/AdBanner.jsx`, root `README.md`.

- [ ] **Step 2: Delete `kiosk/src/components/FaultPanel.jsx`**

- [ ] **Step 3: Rewrite `kiosk/src/App.jsx`** — remove: the FaultPanel import; `DEFAULT_FAULTS`; `faults` state; `slowOverlay` state; `showFaults` state; the `appLoadError` fault effect; the `slowPerf` fault effect; `toggleFault`; the `slowPerf`/`bookingError` special-cases in `handleBook` (plain flow: loading → book → result, errors surface as a normal error message); the slow-overlay JSX; the "⚡ FAULT PANEL" button. `AdBanner` becomes `<AdBanner />` (drop the `disabled` prop wiring). Leave everything else (screens, styling, Faro pushes for normal events) intact.

- [ ] **Step 4: Update root `README.md`** — kiosk description drops "with fault injection"; load-ui description mentions it also drives the real via-trains backend faults.

- [ ] **Step 5: Verify — bundled**

Run: `cd kiosk && npm install --no-audit --no-fund && npm run build && cd .. && ! grep -ri fault kiosk/src`
Expected: vite build succeeds; grep finds nothing (command exits 0 because `!` inverts).

- [ ] **Step 6: Commit**

```bash
git add -A kiosk README.md
git commit -m "Remove fault-injection UI from the customer kiosk

The kiosk is driven by AI personas that must see a plain booking
app. Delete FaultPanel and all fault wiring from App.jsx; AdBanner
is always enabled.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: load-generator relay to booking-service faults

**Files:**
- Create: `load-generator/src/backendFaults.js`
- Create: `load-generator/test/backendFaults.test.js`
- Modify: `load-generator/src/index.js` (mount the router before `app.listen`)
- Modify: `docker-compose.yml` (add `BOOKING_SERVICE_URL` to load-generator; k8s comment)

**Interfaces:**
- Consumes: `BOOKING_SERVICE_URL` env (default `http://host.docker.internal:5080`); upstream `GET/POST/DELETE /api/faults[/:mode]` on booking-service.
- Produces: express routes on the existing load-generator app — `GET /backend-faults`, `POST /backend-faults/:mode`, `DELETE /backend-faults/:mode` — which Task 3's component calls through load-ui's `/api` proxy (so the UI calls `/api/backend-faults[...]` — wait: load-ui's nginx rewrites `/api/` → `/` on load-generator, so the UI calls `/api/backend-faults[/:mode]`).

- [ ] **Step 1: Write the failing test** — `load-generator/test/backendFaults.test.js` using `node:test` (no new deps):

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createBackendFaultsRouter } from '../src/backendFaults.js';

async function withApp(baseUrl, fn) {
  const app = express();
  app.use(express.json());
  app.use(createBackendFaultsRouter(baseUrl));
  const server = app.listen(0);
  const port = server.address().port;
  try { await fn(`http://127.0.0.1:${port}`); } finally { server.close(); }
}

test('GET /backend-faults forwards to booking-service /api/faults', async () => {
  const realFetch = globalThis.fetch;
  let seen = null;
  globalThis.fetch = async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ active_faults: ['slow_db'], slow_db_ms: 250 }), { status: 200, headers: { 'content-type': 'application/json' } }); };
  await withApp('http://booking.test:5080', async (base) => {
    const res = await fetch(`${base}/backend-faults`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { active_faults: ['slow_db'], slow_db_ms: 250 });
    assert.equal(seen.url, 'http://booking.test:5080/api/faults');
  });
  globalThis.fetch = realFetch;
});

test('POST /backend-faults/:mode forwards the mode and method', async () => {
  const realFetch = globalThis.fetch;
  let seen = null;
  globalThis.fetch = async (url, init) => { seen = { url, init }; return new Response(null, { status: 200 }); };
  await withApp('http://booking.test:5080', async (base) => {
    const res = await fetch(`${base}/backend-faults/pool_exhaustion`, { method: 'POST' });
    assert.equal(res.status, 200);
    assert.equal(seen.url, 'http://booking.test:5080/api/faults/pool_exhaustion');
    assert.equal(seen.init.method, 'POST');
  });
  globalThis.fetch = realFetch;
});

test('DELETE /backend-faults/:mode forwards the mode and method', async () => {
  const realFetch = globalThis.fetch;
  let seen = null;
  globalThis.fetch = async (url, init) => { seen = { url, init }; return new Response(null, { status: 200 }); };
  await withApp('http://booking.test:5080', async (base) => {
    const res = await fetch(`${base}/backend-faults/slow_db`, { method: 'DELETE' });
    assert.equal(res.status, 200);
    assert.equal(seen.url, 'http://booking.test:5080/api/faults/slow_db');
    assert.equal(seen.init.method, 'DELETE');
  });
  globalThis.fetch = realFetch;
});

test('unreachable booking-service -> 502 with clear error', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await withApp('http://down.test:5080', async (base) => {
    const res = await fetch(`${base}/backend-faults`);
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'booking-service unreachable' });
  });
  globalThis.fetch = realFetch;
});

test('upstream error status passes through (unknown mode)', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'unknown fault mode' }), { status: 404, headers: { 'content-type': 'application/json' } });
  await withApp('http://booking.test:5080', async (base) => {
    const res = await fetch(`${base}/backend-faults/bogus`, { method: 'POST' });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'unknown fault mode' });
  });
  globalThis.fetch = realFetch;
});
```

- [ ] **Step 2: Verify RED**

Run: `cd load-generator && npm install --no-audit --no-fund && node --test test/`
Expected: FAIL — `Cannot find module '../src/backendFaults.js'` (feature missing, not a typo).

- [ ] **Step 3: Implement `load-generator/src/backendFaults.js`**

```
export function createBackendFaultsRouter(baseUrl) -> express.Router
```
Three routes (`GET /backend-faults`, `POST /backend-faults/:mode`, `DELETE /backend-faults/:mode`): `fetch(baseUrl + '/api/faults' + (mode ? '/' + mode : ''), { method })`; copy upstream status and JSON body; on fetch throw, `res.status(502).json({ error: 'booking-service unreachable' })`.

- [ ] **Step 4: Mount in `load-generator/src/index.js`** — import the factory, `app.use(createBackendFaultsRouter(process.env.BOOKING_SERVICE_URL || 'http://host.docker.internal:5080'))` before `app.listen`.

- [ ] **Step 5: Verify GREEN — bundled**

Run: `cd load-generator && node --test test/ && node -e "import('./src/index.js').catch(()=>{})" 2>&1 | head -3; cd .. && git diff --stat docker-compose.yml`
Expected: 5/5 tests pass; index.js still boots (listens log or no syntax error).

- [ ] **Step 6: Update `docker-compose.yml`** — re-read it first (the SSO-gate commit touched this repo). Add to the load-generator service: `BOOKING_SERVICE_URL: http://host.docker.internal:5080` with a comment: `# k8s: set to the in-cluster booking-service service DNS, e.g. http://booking-service.trains.svc.cluster.local:8080` (verify the actual service name/port from via-trains `deploy/booking-service.yaml` before writing the comment).

- [ ] **Step 7: Commit**

```bash
git add load-generator docker-compose.yml
git commit -m "Add /backend-faults relay in load-generator

Forwards to BOOKING_SERVICE_URL /api/faults (via-trains booking-service);
502 with a clear error when the backend is unreachable. node:test suite
covers forwarding, methods, 502 mapping, and upstream status pass-through.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: load-ui "Backend Faults" section

**Files:**
- Create: `load-ui/src/components/BackendFaults.jsx`
- Modify: `load-ui/src/App.jsx` (mount the component — re-read the file in full first; the SSO-gate commit may have changed it)

**Interfaces:**
- Consumes: Task 2 routes via the existing `/api` proxy — `apiFetch('/backend-faults' + (mode ? '/'+mode : ''), { method })`; GET returns `{ active_faults: [...], slow_db_ms }`; non-200/502 means booking-service unreachable.
- Produces: nothing (terminal UI task).

- [ ] **Step 1: Read `load-ui/src/App.jsx` in full** — palette `C`, `apiFetch`, `FAULT_META`, existing section layout and the 3000ms poll; note where the regional-fault section renders.

- [ ] **Step 2: Create `load-ui/src/components/BackendFaults.jsx`** — section titled "Backend Faults (via-trains)" with a "global — affects all kiosks" note; three rows (Slow DB → `slow_db`, Booking Failure → `booking_failure`, Pool Exhaustion → `pool_exhaustion`), each a toggle calling `apiFetch('/backend-faults/' + mode, { method: active ? 'DELETE' : 'POST' })`; active set polled from `GET /backend-faults` on a 3000ms interval; on fetch failure/502 show a disconnected state ("booking-service unreachable") in this section only; toggle click while disconnected logs/flags the failure without crashing; styling from the shared `C` palette (active = red/orange accent, matching existing fault rows).

- [ ] **Step 3: Mount in `load-ui/src/App.jsx`** alongside the existing regional-fault section (adjacent, clearly separate).

- [ ] **Step 4: Verify — bundled**

Run: `cd load-ui && npm install --no-audit --no-fund && npm run build && cd .. && grep -c "backend-faults" load-ui/src/components/BackendFaults.jsx`
Expected: vite build succeeds; grep ≥ 1.

- [ ] **Step 5: Commit**

```bash
git add load-ui
git commit -m "Add Backend Faults control section to load-ui

Three global toggles (slow_db, booking_failure, pool_exhaustion) driving
the via-trains booking-service fault API through the load-generator
relay, with polling and a disconnected state.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Notes

- `load-ui/nginx.conf` is NOT modified (single-backend model; `/api/` already reaches the new routes).
- Kiosk `Dockerfile`/`nginx.conf`: no changes.
- Task 2's k8s service-DNS comment must match via-trains `deploy/booking-service.yaml` (read-only reference).

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createBackendFaultsRouter } from '../src/backendFaults.js';

// Client-side requests to the test server must use the REAL fetch;
// only the router's upstream calls hit the stub (globalThis.fetch).
const clientFetch = globalThis.fetch;

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
    const res = await clientFetch(`${base}/backend-faults`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { active_faults: ['slow_db'], slow_db_ms: 250 });
    assert.equal(seen.url, 'http://booking.test:5080/api/faults');
    assert.equal(seen.init?.method, 'GET');
  });
  globalThis.fetch = realFetch;
});

test('POST /backend-faults/:mode forwards the mode and method', async () => {
  const realFetch = globalThis.fetch;
  let seen = null;
  globalThis.fetch = async (url, init) => { seen = { url, init }; return new Response(null, { status: 200 }); };
  await withApp('http://booking.test:5080', async (base) => {
    const res = await clientFetch(`${base}/backend-faults/pool_exhaustion`, { method: 'POST' });
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
    const res = await clientFetch(`${base}/backend-faults/slow_db`, { method: 'DELETE' });
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
    const res = await clientFetch(`${base}/backend-faults`);
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'booking-service unreachable' });
  });
  globalThis.fetch = realFetch;
});

test('upstream error status passes through (unknown mode)', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'unknown fault mode' }), { status: 404, headers: { 'content-type': 'application/json' } });
  await withApp('http://booking.test:5080', async (base) => {
    const res = await clientFetch(`${base}/backend-faults/bogus`, { method: 'POST' });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'unknown fault mode' });
  });
  globalThis.fetch = realFetch;
});

import express from 'express';

// Plain forwarder to the via-trains booking-service /api/faults endpoint.
// Backend faults are global to the booking-service — nothing here is per-kiosk.
export function createBackendFaultsRouter(baseUrl) {
  const router = express.Router();

  async function forward(method, mode, res) {
    try {
      const url = `${baseUrl}/api/faults${mode ? '/' + mode : ''}`;
      const upstream = await fetch(url, { method });
      const text = await upstream.text();
      const contentType = upstream.headers.get('content-type') || '';
      res.status(upstream.status);
      res.set('content-type', contentType || 'text/plain');
      res.send(text);
    } catch (err) {
      res.status(502).json({ error: 'booking-service unreachable' });
    }
  }

  router.get('/backend-faults', (req, res) => forward('GET', null, res));
  router.post('/backend-faults/:mode', (req, res) => forward('POST', req.params.mode, res));
  router.delete('/backend-faults/:mode', (req, res) => forward('DELETE', req.params.mode, res));

  return router;
}

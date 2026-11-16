import { matchRoutes } from 'react-router-dom';
import {
  initializeFaro,
  createReactRouterV6DataOptions,
  ReactIntegration,
  getWebInstrumentations,
  LogLevel,
} from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

export const faro = initializeFaro({
  // Estate faro-collector (fe-stackgen-run) instead of the Grafana Cloud
  // collector this demo was originally built for. The receiver CORS policy
  // allows *.stackgen.run, so the kiosk served from trains.stackgen.run is
  // allowed; overridable per build with VITE_FARO_URL.
  url: import.meta.env.VITE_FARO_URL ?? 'https://faro.stackgen.run/collect',
  app: {
    name: 'trainstation-kiosk',
    version: '1.0.0',
    environment: 'production',
  },
  instrumentations: [
    ...getWebInstrumentations(),
    new TracingInstrumentation(),
    new ReactIntegration({
      router: createReactRouterV6DataOptions({
        matchRoutes,
      }),
    }),
  ],
});

// Convenience wrappers so call-sites don't need to import faro instance directly
export function pushLog(message, level = LogLevel.INFO, context = {}) {
  faro.api.pushLog([message], { level, context });
}

export function pushError(error, context = {}) {
  faro.api.pushError(error, { context });
}

export function pushMeasurement(type, values) {
  faro.api.pushMeasurement({ type, values });
}

export function pushEvent(name, attributes = {}) {
  faro.api.pushEvent(name, attributes);
}

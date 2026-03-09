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
  url: 'https://faro-collector-prod-ca-east-0.grafana.net/collect/761f498fabfa4e1df5a556870caf81c0',
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

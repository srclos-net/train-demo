export const REGIONS = {
  ottawa: {
    name: 'Ottawa',
    stations: [
      { id: 'ott-central',  name: 'Ottawa Gare Centrale',    kiosks: 4 },
      { id: 'ott-rideau',   name: 'Ottawa Rideau',           kiosks: 2 },
      { id: 'ott-airport',  name: 'Ottawa Airport Connector', kiosks: 3 },
    ],
  },
  toronto: {
    name: 'Toronto',
    stations: [
      { id: 'tor-union',    name: 'Toronto Union Station',   kiosks: 6 },
      { id: 'tor-bloor',    name: 'Toronto Bloor',           kiosks: 2 },
      { id: 'tor-yorkdale', name: 'Toronto Yorkdale',        kiosks: 2 },
    ],
  },
  montreal: {
    name: 'Montréal',
    stations: [
      { id: 'mtl-central',  name: 'Montréal Gare Centrale',  kiosks: 5 },
      { id: 'mtl-vendome',  name: 'Montréal Vendôme',        kiosks: 2 },
      { id: 'mtl-anjou',    name: 'Montréal Anjou',          kiosks: 2 },
    ],
  },
};

export const TRAINS = [
  { id: 'VIA101', to: 'Toronto',     price: 89 },
  { id: 'VIA655', to: 'Montréal',    price: 54 },
  { id: 'VIA663', to: 'Kingston',    price: 38 },
  { id: 'VIA551', to: 'Québec City', price: 72 },
  { id: 'VIA103', to: 'Toronto',     price: 79 },
];

export const FAULT_TYPES = [
  'booking_error',
  'slow_perf',
  'missing_ads',
  'app_crash',
];

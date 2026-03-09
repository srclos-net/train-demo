export const TRAINS = [
  { id: 'VIA101', from: 'Ottawa', to: 'Toronto',      departs: '08:14', arrives: '12:52', track: '3', seats: 42, price: 89 },
  { id: 'VIA655', from: 'Ottawa', to: 'Montréal',     departs: '09:30', arrives: '11:45', track: '1', seats: 18, price: 54 },
  { id: 'VIA663', from: 'Ottawa', to: 'Kingston',     departs: '10:05', arrives: '11:20', track: '2', seats: 64, price: 38 },
  { id: 'VIA103', from: 'Ottawa', to: 'Toronto',      departs: '13:30', arrives: '18:10', track: '4', seats: 5,  price: 79 },
  { id: 'VIA551', from: 'Ottawa', to: 'Québec City',  departs: '14:45', arrives: '18:20', track: '1', seats: 29, price: 72 },
  { id: 'VIA657', from: 'Ottawa', to: 'Montréal',     departs: '17:00', arrives: '19:15', track: '2', seats: 0,  price: 54 },
];

export const ADS = [
  {
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    accent: '#e94560',
    tag: 'BUSINESS CLASS',
    headline: 'Arrive Ready.',
    sub: 'Upgrade for $29 — Wi-Fi, lounge access, priority boarding.',
    cta: 'UPGRADE NOW',
  },
  {
    bg: 'linear-gradient(135deg, #0d2137 0%, #1b4332 100%)',
    accent: '#52b788',
    tag: 'WEEKEND PASS',
    headline: 'Explore Ontario.',
    sub: 'Unlimited weekend travel for $149. Valid May–August.',
    cta: 'GET PASS',
  },
  {
    bg: 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
    accent: '#f9ca24',
    tag: 'STUDENT FARE',
    headline: 'Go Further.',
    sub: 'Students save 40% every day, every route. Show your card.',
    cta: 'LEARN MORE',
  },
  {
    bg: 'linear-gradient(135deg, #3c1642 0%, #086972 100%)',
    accent: '#f8b500',
    tag: 'VIA REWARDS',
    headline: 'Earn While You Ride.',
    sub: 'Join VIA Préférence. Points on every trip.',
    cta: 'JOIN FREE',
  },
];

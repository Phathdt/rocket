// Reads env + CLI args, applies defaults. CLI args override env.

export interface SimConfig {
  gateway: string;
  count: number;
  center: { lat: number; lng: number };
  radiusKm: number;
  intervalMs: number;
  password: string;
}

const DEFAULTS = {
  gateway: 'http://localhost:3000',
  count: 5,
  center: { lat: 10.7769, lng: 106.7009 }, // HCMC District 1
  radiusKm: 3,
  intervalMs: 4000,
  password: 'password',
};

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg || !arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = 'true';
    }
  }
  return out;
}

function parseCenter(raw: string | undefined, fallback: { lat: number; lng: number }) {
  if (!raw) return fallback;
  const [latStr, lngStr] = raw.split(',');
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return fallback;
}

function num(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(): SimConfig {
  const args = parseArgs(process.argv.slice(2));

  const gateway = args['gateway'] || process.env.SIM_GATEWAY_URL || DEFAULTS.gateway;
  const count = num(args['count'] ?? process.env.SIM_DRIVER_COUNT, DEFAULTS.count);
  const center = parseCenter(args['center'] || process.env.SIM_CENTER, DEFAULTS.center);
  const radiusKm = num(args['radius-km'] ?? process.env.SIM_RADIUS_KM, DEFAULTS.radiusKm);
  const intervalMs = Math.max(
    1000,
    num(args['interval'] ?? process.env.SIM_INTERVAL_MS, DEFAULTS.intervalMs),
  );
  const password = args['password'] || process.env.SIM_PASSWORD || DEFAULTS.password;

  return { gateway, count, center, radiusKm, intervalMs, password };
}

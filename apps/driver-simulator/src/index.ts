// CLI entrypoint: spawn N driver agents, handle SIGINT cleanup.

import { loadConfig } from './config.js';
import { ApiClient, describeError } from './api-client.js';
import { DriverAgent } from './driver-agent.js';

async function main(): Promise<void> {
  const cfg = loadConfig();

  console.log('Driver Simulator');
  console.log(`  gateway   : ${cfg.gateway}`);
  console.log(`  drivers   : ${cfg.count}`);
  console.log(`  center    : ${cfg.center.lat}, ${cfg.center.lng}`);
  console.log(`  radius    : ${cfg.radiusKm} km`);
  console.log(`  interval  : ${cfg.intervalMs} ms`);
  console.log('  (Ctrl+C to stop — all drivers go OFFLINE)\n');

  const api = new ApiClient(cfg.gateway);
  const agents: DriverAgent[] = [];
  for (let i = 1; i <= cfg.count; i++) {
    agents.push(new DriverAgent(i, api, cfg));
  }

  // Start agents in parallel; report per-agent failures without aborting others.
  const results = await Promise.allSettled(agents.map((a) => a.start()));
  results.forEach((r, idx) => {
    if (r.status === 'rejected') {
      console.error(`[${agents[idx]!.label}] start failed: ${describeError(r.reason)}`);
    }
  });

  const started = results.filter((r) => r.status === 'fulfilled').length;
  if (started === 0) {
    console.error('No drivers started — exiting.');
    process.exit(1);
  }
  console.log(`\n${started}/${cfg.count} drivers online. Streaming location updates...\n`);

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received — setting all drivers OFFLINE...`);
    await Promise.allSettled(agents.map((a) => a.stop()));
    console.log('All drivers OFFLINE. Bye.');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(`Fatal: ${describeError(err)}`);
  process.exit(1);
});

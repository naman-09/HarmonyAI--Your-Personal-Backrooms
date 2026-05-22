/**
 * Uninstall Harmony Crisis Monitor Windows Service.
 * Run with: npm run monitor:uninstall  (requires Administrator)
 */
import 'dotenv/config';
import path from 'path';

// @ts-ignore
import nodeWindows from 'node-windows';
const Service = nodeWindows.Service;

const svc = new Service({
  name:   'HarmonymCrisisMonitor',
  script: path.join(process.cwd(), 'scripts', 'crisis-monitor.ts'),
});

svc.on('uninstall', () => {
  console.log('✅ HarmonymCrisisMonitor service removed.');
});

svc.on('error', (err: Error) => {
  console.error('❌ Error:', err.message);
});

console.log('Uninstalling Windows service…');
svc.uninstall();

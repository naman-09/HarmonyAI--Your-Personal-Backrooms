/**
 * Install Harmony Crisis Monitor as a Windows Service.
 * Run with: npm run monitor:install  (requires Administrator)
 */
import 'dotenv/config';
import path from 'path';

// @ts-ignore — node-windows has limited TS types
import nodeWindows from 'node-windows';
const Service = nodeWindows.Service;

const svc = new Service({
  name:        'HarmonymCrisisMonitor',
  description: 'Harmony AI — Background crisis detection and alert service',
  script:      path.join(process.cwd(), 'scripts', 'crisis-monitor.ts'),
  nodeOptions: ['-r', 'tsx/cjs'],
  env: [
    { name: 'DATABASE_URL',      value: process.env.DATABASE_URL    ?? '' },
    { name: 'FAST2SMS_API_KEY',  value: process.env.FAST2SMS_API_KEY ?? '' },
  ],
});

svc.on('install', () => {
  console.log('✅ HarmonymCrisisMonitor service installed. Starting…');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('ℹ️  Service already installed. Use monitor:uninstall first if you want to reinstall.');
});

svc.on('error', (err: Error) => {
  console.error('❌ Service error:', err.message);
});

console.log('Installing Windows service (requires Administrator)…');
svc.install();

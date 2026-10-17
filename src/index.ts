import dns from 'node:dns';
import express from 'express';
import { initClient, shutdownClient } from './services/whatsappService';
import { environment, PORT } from './config/index';
import qrRoutes from './routes/qr';
import adminsRoutes from './routes/admins'; // ✅ novo import

// Prefer IPv4 when resolving hostnames. Railway's egress to some Google hosts
// (e.g. script.googleusercontent.com, where Apps Script redirects) has broken
// IPv6 routing, which made outbound requests hang with ETIMEDOUT. This is the
// in-code equivalent of NODE_OPTIONS=--dns-result-order=ipv4first.
dns.setDefaultResultOrder('ipv4first');

const app = express();
app.disable('x-powered-by');

app.get('/', (_, res) => res.send('🤖 Bot do WhatsApp ativo'));

// ✅ QR route (production only)
if (environment === 'prod') {
  app.use('/qr', qrRoutes);
}

// ✅ route to manage/view admins
app.use('/admins', adminsRoutes);

app.listen(PORT, () => {
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🚀 Server running on port ${PORT}`);

  // ✅ initialize the WhatsApp client
  initClient();
});

// Shut the WhatsApp client down cleanly on deploy/stop so the session is
// flushed to the volume. Railway sends SIGTERM and then SIGKILL after
// RAILWAY_DEPLOYMENT_DRAINING_SECONDS (default 0!) — that variable must be set
// above SHUTDOWN_TIMEOUT_MS so this has time to finish.
const SHUTDOWN_TIMEOUT_MS = 15000;
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`↩️ Received ${signal}, shutting down...`);

  // Exit on our own before the platform's SIGKILL if destroy() ever hangs.
  const forceExit = setTimeout(() => {
    console.error('⏱️ Shutdown timed out; exiting anyway.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  await shutdownClient();
  clearTimeout(forceExit);
  process.exit(0);
}
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });

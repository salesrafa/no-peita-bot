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
// flushed to the volume (Railway sends SIGTERM before killing the container).
async function shutdown(signal: string): Promise<void> {
  console.log(`↩️ Received ${signal}, shutting down...`);
  await shutdownClient();
  process.exit(0);
}
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });

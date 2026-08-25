import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { environment, allowedContacts } from '../config';
import { handleMessage } from './scriptApi';
import { loadAdmins } from './adminService';
import { shouldHandleMessage } from '../core/messageGate';

let lastQr = "";

// Persists the WhatsApp session so restarts/deploys don't require a new QR
// scan. WWEBJS_DATA_PATH should point to durable storage (a Railway Volume
// in production); when unset, LocalAuth falls back to ./.wwebjs_auth.
const dataPath = process.env.WWEBJS_DATA_PATH || '.wwebjs_auth';

/**
 * Removes stale Chromium singleton lock files from the persisted session dirs.
 *
 * Chromium writes SingletonLock/Socket/Cookie into its user-data dir. On
 * Railway the container is killed without a graceful Chromium shutdown, so
 * those files survive in the volume; the next container then sees the lock
 * pointing to a previous host/PID and refuses to launch ("profile appears to
 * be in use by another Chromium process"). Deploys never overlap (the volume
 * forces a single instance), so any lock found at boot is stale and safe to
 * delete.
 */
function clearChromiumSingletonLocks(): void {
  const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie'];
  let sessionDirs: string[];
  try {
    sessionDirs = fs.readdirSync(dataPath).filter((name) => name.startsWith('session'));
  } catch {
    return; // volume empty or not mounted yet — nothing to clean
  }
  for (const dir of sessionDirs) {
    for (const lock of lockFiles) {
      fs.rmSync(path.join(dataPath, dir, lock), { force: true });
    }
  }
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath }),
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

export function initClient(): void {

  client.on('ready', async () => {
  console.log('🤖 Bot ready');

  await client.pupPage?.evaluate(() => {
    const w = window as any;

    if (w.WWebJS?.sendSeen) {
      w.WWebJS.sendSeen = async () => {};
    }
  });
});

  loadAdmins(); // ✅ load admins before initializing
  clearChromiumSingletonLocks(); // drop stale locks left by a killed container
  client.initialize();

  client.on('qr', (qr: string) => {
    lastQr = qr; // still served by /qr when the public domain is enabled
    // Also render the QR to the logs so it can be scanned straight from Railway,
    // without exposing a public /qr endpoint.
    console.log('🟡 QR pendente — escaneie (WhatsApp > Aparelhos conectados):');
    QRCode.toString(qr, { type: 'terminal', small: true })
      .then((ascii) => console.log(ascii))
      .catch((err) => console.error('Erro ao renderizar QR no log:', err));
  });

  client.on('authenticated', () => console.log('🟢 AUTHENTICATED'));
  client.on('auth_failure', msg => console.error('🔴 AUTH FAILURE:', msg));
  client.on('disconnected', (reason) =>
    console.error('🔴 WhatsApp DISCONNECTED:', reason, '— aguardando novo QR nos logs.')
  );

  client.on('message', async (msg: Message) => {
    if (!shouldHandleMessage(msg.body, msg.from, environment, allowedContacts)) return;

    try {
      await handleMessage(msg, client);
    } catch (err) {
      console.error('Error processing message:', err);
      await msg.reply('⚠️ Ocorreu um erro ao processar seu comando.');
    }
  });
}

export function getLastQr(): string {
  return lastQr;
}

// Closes the WhatsApp client cleanly so LocalAuth flushes the session to the
// volume before the process exits. Called on SIGTERM/SIGINT (Railway sends
// SIGTERM before killing on deploy) to avoid corrupting the saved session,
// which would otherwise force a fresh QR scan on the next boot.
export async function shutdownClient(): Promise<void> {
  try {
    await client.destroy();
    console.log('👋 WhatsApp client destroyed cleanly.');
  } catch (err) {
    console.error('Error destroying WhatsApp client:', err);
  }
}

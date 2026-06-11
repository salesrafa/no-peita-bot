import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { environment, allowedContacts } from '../config';
import { handleMessage } from './scriptApi';
import { loadAdmins } from './adminService';
import { shouldHandleMessage } from '../core/messageGate';

let lastQr = "";

const client = new Client({
  // Persists the WhatsApp session so restarts/deploys don't require a new QR
  // scan. WWEBJS_DATA_PATH should point to durable storage (a Railway Volume
  // in production); when unset, LocalAuth falls back to ./.wwebjs_auth.
  authStrategy: new LocalAuth({ dataPath: process.env.WWEBJS_DATA_PATH }),
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
  client.initialize();

  client.on('qr', (qr: string) => {
    if (environment === 'prod') {
      lastQr = qr;
    } else {
      console.log('🟡 QR RECEIVED:\n', qr);
    }
  });

  client.on('authenticated', () => console.log('🟢 AUTHENTICATED'));
  client.on('auth_failure', msg => console.error('🔴 AUTH FAILURE:', msg));

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

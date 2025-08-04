import { Client, Message } from 'whatsapp-web.js';
import { enviroment, allowedContacts } from '../config';
import { handleMessage } from './scriptApi';
import { carregarAdmins, isAdmin } from './adminService';

let ultimaQr = "";

const client = new Client({
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

export function initClient(): void {
  
  carregarAdmins(); // ✅ carrega admins antes de inicializar
  client.initialize();

  client.on('qr', (qr: string) => {
    if (enviroment === 'prod') {
      ultimaQr = qr;
    } else {
      console.log('🟡 QR RECEIVED:\n', qr);
    }
  });

  client.on('authenticated', () => console.log('🟢 AUTHENTICATED'));
  client.on('auth_failure', msg => console.error('🔴 AUTH FAILURE:', msg));

  client.on('message', async (msg: Message) => {
    const from = msg.from;
    const isAllowed = allowedContacts.includes(from);
    const isCommand = msg.body.startsWith('/');

    if (!isCommand) return;
    if (enviroment !== 'prod' && !isAllowed) return;

    try {
      await handleMessage(msg, client, ultimaQr);
    } catch (err) {
      console.error('Erro ao processar mensagem:', err);
      await msg.reply('⚠️ Ocorreu um erro ao processar seu comando.');
    }
  });
}

export function getUltimaQr(): string {
  return ultimaQr;
}

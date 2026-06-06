import axios from 'axios';
import { Client, Message } from 'whatsapp-web.js';
import { url, header, scriptAuthToken } from '../config';

export async function handleMessage(msg: Message, client: Client, ultimaQr: string): Promise<void> {
  try {
    const params = new URLSearchParams();
    const sender = `whatsapp:+${(msg.author || msg.from).split('@')[0]}`;

    params.append('token', scriptAuthToken);
    params.append('Body', msg.body);
    params.append('From', sender);

    const response = await axios.post(url, params, { headers: header });

    (client as any).sendSeen = async () => {};

    await client.sendMessage(msg.from, response.data);

  } catch (err) {
    console.error('Erro ao lidar com mensagem:', err);
    await msg.reply('⚠️ Ocorreu um erro ao processar seu comando.');
  }
}

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

    // Id da própria mensagem — guardado junto do treino para permitir apagá-lo
    // depois citando a mensagem de /pontuar.
    params.append('MsgId', msg.id?._serialized ?? '');

    // Quando a mensagem é uma resposta (citação), envia o id da mensagem citada
    // — usado pelo /apagar (admin cita o /pontuar do treino a remover).
    if (msg.hasQuotedMsg) {
      try {
        const quoted = await msg.getQuotedMessage();
        params.append('QuotedMsgId', quoted?.id?._serialized ?? '');
      } catch (err) {
        console.error('Não foi possível obter a mensagem citada:', err);
      }
    }

    const response = await axios.post(url, params, { headers: header });

    (client as any).sendSeen = async () => {};

    await client.sendMessage(msg.from, response.data);

  } catch (err) {
    console.error('Erro ao lidar com mensagem:', err);
    await msg.reply('⚠️ Ocorreu um erro ao processar seu comando.');
  }
}

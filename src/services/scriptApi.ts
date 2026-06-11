import axios from 'axios';
import { Client, Message } from 'whatsapp-web.js';
import { url, header, scriptAuthToken } from '../config';

export async function handleMessage(msg: Message, client: Client): Promise<void> {
  try {
    const params = new URLSearchParams();
    const sender = `whatsapp:+${(msg.author || msg.from).split('@')[0]}`;

    params.append('token', scriptAuthToken);
    params.append('Body', msg.body);
    params.append('From', sender);

    // Id of the message itself — stored with the workout so it can be deleted
    // later by quoting the /pontuar message.
    params.append('MsgId', msg.id?._serialized ?? '');

    // When the message is a reply (quote), send the quoted message's id —
    // used by /apagar (an admin quotes the /pontuar of the workout to remove).
    if (msg.hasQuotedMsg) {
      try {
        const quoted = await msg.getQuotedMessage();
        params.append('QuotedMsgId', quoted?.id?._serialized ?? '');
      } catch (err) {
        console.error('Could not get the quoted message:', err);
      }
    }

    const response = await axios.post(url, params, { headers: header });

    (client as any).sendSeen = async () => {};

    await client.sendMessage(msg.from, response.data);

  } catch (err) {
    console.error('Error handling message:', err);
    await msg.reply('⚠️ Ocorreu um erro ao processar seu comando.');
  }
}

import axios from 'axios';
import { Client, Message } from 'whatsapp-web.js';
import { url, header, scriptAuthToken } from '../config';

export async function handleMessage(msg: Message, client: Client): Promise<void> {
  let responseData: string;

  // Phase 1 — forward the command to the backend. A failure here means the
  // command was NOT processed, so it's fair to tell the user it failed.
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

    // timeout so a network stall fails fast (and the user gets the error
    // reply) instead of hanging forever — the default is no timeout.
    const response = await axios.post(url, params, { headers: header, timeout: 20000 });
    responseData = response.data;
  } catch (err) {
    console.error('Error handling message (backend call failed):', err);
    try {
      await msg.reply('⚠️ Ocorreu um erro ao processar seu comando.');
    } catch (replyErr) {
      console.error('Also failed to send the error reply:', replyErr);
    }
    return;
  }

  // Keep the bot from marking messages as read (blue ticks).
  (client as any).sendSeen = async () => {};

  // Phase 2 — deliver the backend's answer. The command ALREADY ran (e.g. the
  // workout is saved), so a failure here is a delivery problem, not a
  // processing error: do NOT send "erro ao processar" — that would be wrong and
  // make the user retry, duplicating the action. We use msg.reply (targets the
  // message's own chat) instead of client.sendMessage(msg.from), which can throw
  // on group/@lid addressing even after a successful save — the exact cause of
  // "workout recorded but replied with an error".
  try {
    await msg.reply(responseData);
  } catch (err) {
    console.error('Command processed but failed to deliver the reply:', err);
  }
}

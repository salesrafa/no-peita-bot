import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
import axios from 'axios';
import { handleMessage } from '../../src/services/scriptApi';

const post = axios.post as unknown as ReturnType<typeof vi.fn>;

function fakeMsg(over: Partial<any> = {}): any {
  return {
    id: { _serialized: 'MSG-1' },
    from: '111@c.us',
    body: '/pontuar',
    hasQuotedMsg: false,
    getQuotedMessage: vi.fn(),
    reply: vi.fn(),
    ...over,
  };
}

describe('handleMessage', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: '✅ Treino registrado com sucesso!' });
  });

  it('forwards Body/From/MsgId and replies with the Apps Script response', async () => {
    const client: any = { sendMessage: vi.fn() };
    await handleMessage(fakeMsg(), client);

    expect(post).toHaveBeenCalledTimes(1);
    const params = post.mock.calls[0][1] as URLSearchParams;
    expect(params.get('Body')).toBe('/pontuar');
    expect(params.get('From')).toBe('whatsapp:+111');
    expect(params.get('MsgId')).toBe('MSG-1');
    expect(params.get('QuotedMsgId')).toBeNull();

    expect(client.sendMessage).toHaveBeenCalledWith('111@c.us', '✅ Treino registrado com sucesso!');
  });

  it('forwards QuotedMsgId when the message is a reply', async () => {
    const client: any = { sendMessage: vi.fn() };
    const msg = fakeMsg({
      body: '/apagar',
      hasQuotedMsg: true,
      getQuotedMessage: vi.fn().mockResolvedValue({ id: { _serialized: 'QUOTED-9' } }),
    });
    await handleMessage(msg, client);

    const params = post.mock.calls[0][1] as URLSearchParams;
    expect(params.get('QuotedMsgId')).toBe('QUOTED-9');
  });

  it('replies with an error message when the call throws', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    post.mockRejectedValueOnce(new Error('boom'));
    const msg = fakeMsg();
    const client: any = { sendMessage: vi.fn() };
    await handleMessage(msg, client);

    expect(msg.reply).toHaveBeenCalledWith('⚠️ Ocorreu um erro ao processar seu comando.');
    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
import axios from 'axios';
import { handleMessage, postToBackend } from '../../src/services/scriptApi';

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
    const msg = fakeMsg();
    const client: any = { sendMessage: vi.fn() };
    await handleMessage(msg, client);

    expect(post).toHaveBeenCalledTimes(1);
    const params = post.mock.calls[0][1] as URLSearchParams;
    expect(params.get('Body')).toBe('/pontuar');
    expect(params.get('From')).toBe('whatsapp:+111');
    expect(params.get('MsgId')).toBe('MSG-1');
    expect(params.get('QuotedMsgId')).toBeNull();

    // delivered via msg.reply (reliable), not client.sendMessage(msg.from)
    expect(msg.reply).toHaveBeenCalledWith('✅ Treino registrado com sucesso!');
  });

  it('does not report a processing error when the command succeeded but delivery fails', async () => {
    // The exact reported bug: /pontuar saved the workout (post resolved) but the
    // reply throws — the user must NOT get "Ocorreu um erro" (they'd retry and
    // duplicate the workout).
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const msg = fakeMsg({ reply: vi.fn().mockRejectedValue(new Error('send failed')) });
    const client: any = { sendMessage: vi.fn() };
    await handleMessage(msg, client);

    expect(msg.reply).toHaveBeenCalledTimes(1);
    expect(msg.reply).toHaveBeenCalledWith('✅ Treino registrado com sucesso!');
    expect(msg.reply).not.toHaveBeenCalledWith('⚠️ Ocorreu um erro ao processar seu comando.');

    errSpy.mockRestore();
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

describe('postToBackend (retry on 404 only)', () => {
  const params = new URLSearchParams();

  beforeEach(() => {
    post.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('retries a transient 404 and then succeeds', async () => {
    post.mockRejectedValueOnce({ response: { status: 404 } });
    post.mockResolvedValueOnce({ data: 'ok' });

    const res = await postToBackend(params, 3, 0);

    expect(res).toEqual({ data: 'ok' });
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('gives up after the max attempts on a persistent 404', async () => {
    post.mockRejectedValue({ response: { status: 404 } });

    await expect(postToBackend(params, 3, 0)).rejects.toMatchObject({ response: { status: 404 } });
    expect(post).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry a timeout (it may have executed — avoids duplicates)', async () => {
    post.mockRejectedValue({ code: 'ETIMEDOUT', message: 'timeout of 20000ms exceeded' });

    await expect(postToBackend(params, 3, 0)).rejects.toMatchObject({ code: 'ETIMEDOUT' });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry non-404 HTTP errors', async () => {
    post.mockRejectedValue({ response: { status: 500 } });

    await expect(postToBackend(params, 3, 0)).rejects.toMatchObject({ response: { status: 500 } });
    expect(post).toHaveBeenCalledTimes(1);
  });
});

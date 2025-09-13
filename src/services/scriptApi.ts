import axios from 'axios';
import { Client, Message } from 'whatsapp-web.js';
import { gerarDatasLuaCheia } from './cacheService';
import { url, header } from '../config';

interface CachePendente {
  cache: string;
  ano: number;
  mes: number;
}

export async function precisaAtualizar(): Promise<CachePendente[]> {
  try {
    const response = await axios.get<CachePendente[]>(`${url}?action=precisaAtualizarCaches`);
    return response.data;
  } catch (error) {
    console.error('Erro ao verificar caches pendentes:', error);
    return [];
  }
}

export async function enviarCacheLuaCheia(ano: number, mes: number, datas: string[]): Promise<void> {
  const params = new URLSearchParams();
  params.append('Body', 'atualizaLuaCheia');
  params.append('Ano', String(ano));
  params.append('Mes', String(mes));
  params.append('Datas', datas.join(', '));

  try {
    await axios.post(url, params, { headers: header });
  } catch (error) {
    console.error(`Erro ao enviar cache de Lua Cheia ${mes}/${ano}:`, error);
  }
}

export async function handleMessage(msg: Message, client: Client, ultimaQr: string): Promise<void> {
  try {
    // 🔍 Etapa 1: Atualizar caches se necessário
    // const pendentes = await precisaAtualizar();

    // for (const cache of pendentes) {
    //   if (cache.cache === 'lua_cheia') {
    //     const { ano, mes } = cache;
    //     const datas = gerarDatasLuaCheia(ano, mes);
    //     await enviarCacheLuaCheia(ano, mes, datas);
    //   }
    // }

    // 🔄 Etapa 2: Encaminhar mensagem para o Apps Script
    const params = new URLSearchParams();
    const sender = `whatsapp:+${(msg.author || msg.from).split('@')[0]}`;

    params.append('Body', msg.body);
    params.append('From', sender);

    const response = await axios.post(url, params, { headers: header });

    await msg.reply(response.data);
  } catch (err) {
    console.error('Erro ao lidar com mensagem:', err);
    await msg.reply('⚠️ Ocorreu um erro ao processar seu comando.');
  }
}

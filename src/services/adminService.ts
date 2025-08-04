import axios from 'axios';
import { url } from '../config';

let adminSet = new Set<string>();

export async function carregarAdmins() {
  try {
    const { data } = await axios.get(`${url}?action=getAdmins`);
    adminSet = new Set(data.map((u: any) => String(u.numero)));
    console.log(`✅ Admins carregados: ${[...adminSet].join(', ')}`);
  } catch (err) {
    console.error('❌ Erro ao carregar admins:', err);
  }
}

export function isAdmin(numero: string): boolean {
  return adminSet.has(numero);
}

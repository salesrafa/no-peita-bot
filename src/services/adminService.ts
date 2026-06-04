import axios from 'axios';
import { url, scriptAuthToken } from '../config';

let adminSet = new Set<string>();

export async function carregarAdmins(): Promise<void> {
  try {
    const { data } = await axios.get(
      `${url}?action=getAdmins&token=${encodeURIComponent(scriptAuthToken)}`
    );
    adminSet = new Set(data.map((u: any) => String(u.numero)));
    console.log(`✅ Admins carregados: ${[...adminSet].join(', ')}`);
  } catch (err) {
    console.error('❌ Erro ao carregar admins:', err);
  }
}

export function isAdmin(numero: string): boolean {
  return adminSet.has(numero);
}

export function getAdminsList(): string[] {
  return Array.from(adminSet);
}

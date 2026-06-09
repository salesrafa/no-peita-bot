import axios from 'axios';
import { url, scriptAuthToken } from '../config';

let adminSet = new Set<string>();

export async function loadAdmins(): Promise<void> {
  try {
    const { data } = await axios.get(
      `${url}?action=getAdmins&token=${encodeURIComponent(scriptAuthToken)}`
    );
    adminSet = new Set(data.map((u: any) => String(u.number)));
    console.log(`✅ Admins loaded: ${[...adminSet].join(', ')}`);
  } catch (err) {
    console.error('❌ Error loading admins:', err);
  }
}

export function isAdmin(number: string): boolean {
  return adminSet.has(number);
}

export function getAdminsList(): string[] {
  return Array.from(adminSet);
}

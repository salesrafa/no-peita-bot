import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
import axios from 'axios';
import { loadAdmins, isAdmin, getAdminsList } from '../../src/services/adminService';

const get = axios.get as unknown as ReturnType<typeof vi.fn>;

describe('adminService', () => {
  beforeEach(() => get.mockReset());

  it('loads admins from getAdmins (reading the `number` field)', async () => {
    get.mockResolvedValue({ data: [{ number: '111', name: 'A' }, { number: '222', name: 'B' }] });
    await loadAdmins();

    expect(isAdmin('111')).toBe(true);
    expect(isAdmin('222')).toBe(true);
    expect(isAdmin('999')).toBe(false);
    expect(getAdminsList()).toEqual(['111', '222']);
  });

  it('does not throw on failure (keeps the bot running)', async () => {
    get.mockRejectedValueOnce(new Error('network down'));
    await expect(loadAdmins()).resolves.toBeUndefined();
  });
});

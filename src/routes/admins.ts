import express, { Request, Response } from 'express';
import { loadAdmins, getAdminsList } from '../services/adminService';

const router = express.Router();

// ✅ Returns in-memory admins
router.get('/', (req: Request, res: Response) => {
  res.json({ admins: getAdminsList() });
});

// ✅ Forces an admin refresh
router.post('/refresh', async (req: Request, res: Response) => {
  await loadAdmins();
  res.json({ message: '✅ Admins recarregados com sucesso', admins: getAdminsList() });
});

export default router;

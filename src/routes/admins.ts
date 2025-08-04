import express, { Request, Response } from 'express';
import { carregarAdmins, getAdminsList } from '../services/adminService';

const router = express.Router();

// ✅ Retorna admins em memória
router.get('/', (req: Request, res: Response) => {
  res.json({ admins: getAdminsList() });
});

// ✅ Força atualização de admins
router.post('/refresh', async (req: Request, res: Response) => {
  await carregarAdmins();
  res.json({ message: '✅ Admins recarregados com sucesso', admins: getAdminsList() });
});

export default router;

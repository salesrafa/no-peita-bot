import express, { Request, Response } from 'express';
import QRCode from 'qrcode';
import { getLastQr } from '../services/whatsappService';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  const qr = getLastQr();

  if (!qr) {
    return res.send('❌ QR Code ainda não gerado. Aguarde a inicialização do cliente.');
  }

  try {
    const qrImage = await QRCode.toDataURL(qr);
    res.send(`<h2>Escaneie o QR abaixo para logar no WhatsApp:</h2><img src="${qrImage}" />`);
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    res.status(500).send('Erro ao gerar o QR Code.');
  }
});

export default router;

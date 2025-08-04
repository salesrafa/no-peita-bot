import express from 'express';
import { initClient } from './services/whatsappService';
import { enviroment, PORT } from './config/index';
import qrRoutes from './routes/qr';

const app = express();

app.get('/', (_, res) => res.send('🤖 Bot do WhatsApp ativo'));

if (enviroment === 'prod') {
  app.use('/qr', qrRoutes);
}

app.listen(PORT, () => {
  console.log(enviroment);
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  initClient();
});

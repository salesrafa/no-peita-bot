import express from 'express';
import { initClient } from './services/whatsappService';
import { enviroment, PORT } from './config/index';
import qrRoutes from './routes/qr';
import adminsRoutes from './routes/admins'; // ✅ novo import

const app = express();

app.get('/', (_, res) => res.send('🤖 Bot do WhatsApp ativo'));

// ✅ rota para QR (apenas em produção)
if (enviroment === 'prod') {
  app.use('/qr', qrRoutes);
}

// ✅ nova rota para gerenciar/ver admins
app.use('/admins', adminsRoutes);

app.listen(PORT, () => {
  console.log(`🌍 Ambiente: ${enviroment}`);
  console.log(`🚀 Servidor rodando na porta ${PORT}`);

  // ✅ inicializa o cliente WhatsApp
  initClient();
});

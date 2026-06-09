import express from 'express';
import { initClient } from './services/whatsappService';
import { environment, PORT } from './config/index';
import qrRoutes from './routes/qr';
import adminsRoutes from './routes/admins'; // ✅ novo import

const app = express();

app.get('/', (_, res) => res.send('🤖 Bot do WhatsApp ativo'));

// ✅ QR route (production only)
if (environment === 'prod') {
  app.use('/qr', qrRoutes);
}

// ✅ route to manage/view admins
app.use('/admins', adminsRoutes);

app.listen(PORT, () => {
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🚀 Server running on port ${PORT}`);

  // ✅ initialize the WhatsApp client
  initClient();
});

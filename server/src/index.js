import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import { setupSocketHandlers } from './socket/socketHandler.js';
import { getSettings } from './models/Settings.js';

const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      callback(null, true);
    },
    methods: ['GET', 'POST'],
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

setupSocketHandlers(io);

async function start() {
  const connected = await connectDB();
  if (!connected) {
    console.error('\n❌ Cannot start without MongoDB. Exiting.\n');
    process.exit(1);
  }

  await getSettings(); // ensure the singleton settings document exists

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔐 Admin panel password: ${process.env.ADMIN_PASSWORD ? '(from .env)' : 'admin123 (default — set ADMIN_PASSWORD in .env)'}\n`);
  });
}

start();

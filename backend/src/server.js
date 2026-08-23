require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedDatabase = require('./seed');

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Start HTTP server immediately
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n=================================================`);
    console.log(`🚀 KBZ Marcomms Backend API Server running!`);
    console.log(`🌐 Local API URL: http://localhost:${PORT}`);
    console.log(`📡 Health Check:  http://localhost:${PORT}/health`);
    console.log(`=================================================\n`);

    // Connect to MongoDB Atlas
    try {
      const conn = await connectDB();
      if (conn) {
        await seedDatabase();
      }
    } catch (err) {
      console.warn('[Server Startup] DB connection will retry in the background.');
    }
  });
}

startServer();

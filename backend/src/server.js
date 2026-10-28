require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedDatabase = require('./seed');

const PORT = process.env.PORT || 5000;
const DB_RETRY_DELAY_MS = 10000;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function connectDatabaseWithRetry() {
  while (true) {
    try {
      return await connectDB();
    } catch (error) {
      console.warn('[Server Startup] MongoDB connection failed; retrying in 10 seconds.', {
        name: error.name
      });
      await wait(DB_RETRY_DELAY_MS);
    }
  }
}

async function startServer() {
  // Do not accept login or API requests until MongoDB is ready. With
  // bufferCommands disabled, serving requests earlier causes findOne() to fail.
  await connectDatabaseWithRetry();
  await seedDatabase();
  require('./services/backfillMonthlyPaySheet')().catch(error => console.warn('[Monthly report backfill]',error.name));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================================`);
    console.log(`🚀 KBZ Marcomms Backend API Server running!`);
    console.log(`🌐 Local API URL: http://localhost:${PORT}`);
    console.log(`📡 Health Check:  http://localhost:${PORT}/health`);
    console.log(`=================================================\n`);

  });
}

startServer().catch((error) => {
  console.error('[Server Startup] Fatal initialization error.', { name: error.name });
  process.exit(1);
});

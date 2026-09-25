const mongoose = require('mongoose');

let cachedConnection = null;
let isConnecting = false;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  if (isConnecting) return;
  isConnecting = true;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[MongoDB] MONGODB_URI environment variable is missing.');
    isConnecting = false;
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      bufferCommands: false
    });
    cachedConnection = conn;
    isConnecting = false;
    return conn;
  } catch (error) {
    isConnecting = false;
    console.warn('[MongoDB] Connection attempt failed; retry scheduled.', { name: error.name });
    // Schedule background retry every 10s
    setTimeout(connectDB, 10000);
  }
}

module.exports = connectDB;

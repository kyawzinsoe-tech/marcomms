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
    console.log(`[MongoDB] Connected successfully to Atlas Cluster: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    isConnecting = false;
    console.warn(`\n⚠️  [MongoDB Notice] Connection attempt pending.`);
    console.warn(`Reason: ${error.message}`);
    console.warn(`Tip: If this is an IP whitelist issue, in MongoDB Atlas -> Network Access -> Add IP: "0.0.0.0/0" (or current IP: 54.255.149.19)\n`);
    // Schedule background retry every 10s
    setTimeout(connectDB, 10000);
  }
}

module.exports = connectDB;

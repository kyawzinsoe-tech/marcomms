const mongoose = require('mongoose');

let cachedConnection = null;
let connectionPromise = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  if (connectionPromise) return connectionPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('[MongoDB] MONGODB_URI environment variable is missing.');
  }

  connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      bufferCommands: false
    })
    .then((conn) => {
      cachedConnection = conn;
      return conn;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
}

module.exports = connectDB;

require('dotenv').config();
const serverlessExpress = require('@vendia/serverless-express');
const app = require('./app');
const connectDB = require('./config/db');

let serverlessExpressInstance = null;

async function setup(event, context) {
  // Ensure DB connection is established
  await connectDB();

  // Initialize serverless express wrapper
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

exports.handler = async (event, context) => {
  // Allow callback to return immediately without waiting for NodeJS event loop
  context.callbackWaitsForEmptyEventLoop = false;

  if (serverlessExpressInstance) {
    await connectDB();
    return serverlessExpressInstance(event, context);
  }

  return setup(event, context);
};

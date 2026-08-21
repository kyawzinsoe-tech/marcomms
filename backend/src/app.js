const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const backupRoutes = require('./routes/backupRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'KBZ Marcomms Creative Hub Backend API',
    version: '3.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'KBZ Marcomms API', time: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/backup', backupRoutes);

// Error Handling
app.use(errorHandler);

module.exports = app;

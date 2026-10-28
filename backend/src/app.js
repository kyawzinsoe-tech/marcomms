const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const backupRoutes = require('./routes/backupRoutes');
const assetRoutes = require('./routes/assetRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const productionOrderRoutes = require('./routes/productionOrderRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const importantWorkRoutes = require('./routes/importantWorkRoutes');
const recruitmentRoutes = require('./routes/recruitmentRoutes');
const productionInventoryRoutes = require('./routes/productionInventoryRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const monthlyProjectReportRoutes = require('./routes/monthlyProjectReportRoutes');

const app = express();
app.set('trust proxy', 1);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',').map((value) => value.trim()).filter(Boolean);

// Middlewares
app.use((req, res, next) => cors({
  origin(origin, callback) {
    const sameOrigin = `${req.protocol}://${req.get('host')}`;
    if (!origin || origin === sameOrigin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS policy.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-File-Name']
})(req, res, next));
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && req.path !== '/health') return next();
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
if (process.env.NODE_ENV !== 'production') app.get('/', (req, res) => {
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
app.use('/api/navigation-data', require('./routes/navigationDataRoutes'));
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/production-orders', productionOrderRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/important-work', importantWorkRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/production-inventory', productionInventoryRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/monthly-project-reports', monthlyProjectReportRoutes);

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  const indexFile = path.join(frontendDist, 'index.html');
  const setFrontendHeaders = (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; frame-src https://drive.google.com; upgrade-insecure-requests");
  };
  if (fs.existsSync(indexFile)) {
    app.use(express.static(frontendDist, { setHeaders: setFrontendHeaders }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      setFrontendHeaders(res);
      return res.sendFile(indexFile);
    });
  }
}

// Error Handling
app.use(errorHandler);

module.exports = app;

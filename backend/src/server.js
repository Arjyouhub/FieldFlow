import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from './config/db.js';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import developerRoutes from './routes/developerRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import callRoutes from './routes/callRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import { logApiHit } from './controllers/developerController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security hardening
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows uploaded images/evidence to load in admin & mobile
    contentSecurityPolicy: false, // Prevents breaking inline scripts/APIs while securing headers
  })
);

// Gzip / Deflate compression for low latency and high performance
app.use(compression());

// Production CORS handling
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['*'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev/staging with log
      }
    },
    credentials: true,
  })
);

// Payload parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static file serving for evidence photos & attachments
const uploadDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir, { maxAge: '1d' }));

// Request logging & telemetry for developer diagnostics
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logApiHit(req, res.statusCode, duration);
  });
  next();
});

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/developer', developerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/calls', callRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'FieldFlow Core API Platform is operational.',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      health: '/api/health',
      auth: '/api/auth/login',
      customers: '/api/customers',
      locations: '/api/locations',
      visits: '/api/visits',
      admin: '/api/admin/dashboard-stats',
      developer: '/api/developer/overview',
      upload: '/api/upload/photo',
    },
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('[FieldFlow Error Handler]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason) => {
  console.error('[FieldFlow Fatal] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FieldFlow Fatal] Uncaught Exception:', err);
});

// Start Server with Graceful Shutdown
let serverInstance = null;

async function startServer() {
  await connectDB();
  serverInstance = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 FieldFlow Backend Server running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`===============================================`);
  });

  const handleShutdown = async (signal) => {
    console.log(`\n[FieldFlow Server] Received ${signal}. Initiating graceful shutdown...`);
    if (serverInstance) {
      serverInstance.close(async () => {
        console.log('[FieldFlow Server] HTTP connections closed.');
        await disconnectDB();
        console.log('[FieldFlow Server] Graceful shutdown complete. Exiting process.');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('[FieldFlow Server] Forcefully shutting down after timeout.');
        process.exit(1);
      }, 10000);
    } else {
      await disconnectDB();
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

// If invoked directly, start server
if (process.env.NODE_ENV !== 'test_embedded' && !process.env.NODE_TEST_CONTEXT && !process.argv.some(arg => arg.includes('test'))) {
  startServer();
}

export { app };


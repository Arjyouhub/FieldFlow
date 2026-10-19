import mongoose from 'mongoose';

/**
 * Production-ready MongoDB connection manager with connection pooling,
 * MongoDB Atlas support, reconnect listeners, and graceful shutdown.
 */

let isConnecting = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/fieldflow';
  const isAtlas = uri.startsWith('mongodb+srv://');

  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (isConnecting) {
    return false;
  }

  isConnecting = true;

  // Configure mongoose defaults for production stability
  mongoose.set('autoIndex', process.env.NODE_ENV !== 'production'); // Prevent index build blocking in production
  mongoose.set('strictQuery', true);

  // Attach lifecycle event listeners once
  if (!mongoose.connection._hasFieldFlowListeners) {
    mongoose.connection.on('connected', () => {
      console.log(`[FieldFlow DB] ✓ MongoDB connected successfully to: ${mongoose.connection.name} (${isAtlas ? 'MongoDB Atlas Cloud' : mongoose.connection.host})`);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[FieldFlow DB Error] MongoDB connection error:`, err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(`[FieldFlow DB Warning] MongoDB disconnected. Attempting to restore connection...`);
    });

    mongoose.connection.on('reconnected', () => {
      console.log(`[FieldFlow DB] ✓ MongoDB reconnected successfully.`);
    });

    mongoose.connection._hasFieldFlowListeners = true;
  }

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: Number(process.env.DB_MAX_POOL_SIZE) || 50,
      minPoolSize: Number(process.env.DB_MIN_POOL_SIZE) || 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      w: 'majority',
    });

    isConnecting = false;
    return true;
  } catch (error) {
    isConnecting = false;
    console.error(`[FieldFlow DB Error] Failed to connect to MongoDB: ${error.message}`);
    if (isAtlas) {
      console.warn('[FieldFlow DB Tip] For MongoDB Atlas, verify your IP is whitelisted (Network Access -> Allow 0.0.0.0/0 or Current IP) and database credentials are correct.');
    } else {
      console.warn('[FieldFlow DB Tip] For local MongoDB, ensure MongoDB service is started, or provide MONGODB_URI in backend/.env');
    }
    return false;
  }
}

export async function disconnectDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log('[FieldFlow DB] MongoDB connection closed gracefully.');
    }
  } catch (err) {
    console.error('[FieldFlow DB] Error during graceful database disconnect:', err.message);
  }
}

export function getDbStatus() {
  const states = {
    0: 'DISCONNECTED',
    1: 'CONNECTED',
    2: 'CONNECTING',
    3: 'DISCONNECTING',
  };
  return {
    state: states[mongoose.connection.readyState] || 'UNKNOWN',
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    isAtlas: (process.env.MONGODB_URI || '').startsWith('mongodb+srv://'),
  };
}


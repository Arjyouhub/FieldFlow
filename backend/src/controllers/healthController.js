import os from 'os';
import { getDbStatus } from '../config/db.js';

export function getHealth(req, res) {
  const dbStatus = getDbStatus();

  return res.json({
    success: true,
    service: 'FieldFlow Core API Server',
    status: dbStatus.state === 'CONNECTED' ? 'ONLINE' : 'DEGRADED',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus.state,
      name: dbStatus.name || 'fieldflow',
      isAtlas: dbStatus.isAtlas,
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      freeSystemMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      totalSystemMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    },
  });
}

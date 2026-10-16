import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { SecurityEvent } from '../models/SecurityEvent.js';

export async function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fieldflow_secure_jwt_secret_dev_key_2026');

    // Check if token has been revoked in Session table
    const session = await Session.findOne({ token, isValid: true });
    // If sessions exist in DB and this one is revoked
    const anySession = await Session.findOne({ token });
    if (anySession && !anySession.isValid) {
      await SecurityEvent.create({
        eventType: 'SESSION_REVOKED',
        severity: 'MEDIUM',
        actor: { identifier: decoded.id, role: 'user' },
        endpoint: req.originalUrl,
        ipAddress: req.ip || '127.0.0.1',
        details: { message: 'Attempt to use revoked session token' },
      }).catch(() => {});

      return res.status(401).json({
        success: false,
        message: 'Your session has been revoked. Please sign in again.',
      });
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently inactive. Please contact admin.',
      });
    }

    if (session) {
      session.lastActiveAt = new Date();
      session.save().catch(() => {});
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token.',
      error: error.message,
    });
  }
}

export function authorize(...roles) {
  return async (req, res, next) => {
    // Treat 'super_admin' as having admin rights as well
    const effectiveRoles = [...roles];
    if (effectiveRoles.includes('admin') && !effectiveRoles.includes('super_admin')) {
      effectiveRoles.push('super_admin');
    }

    if (!req.user || !effectiveRoles.includes(req.user.role)) {
      await SecurityEvent.create({
        eventType: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        actor: { identifier: req.user?.phone || req.user?._id, role: req.user?.role || 'guest' },
        endpoint: req.originalUrl,
        ipAddress: req.ip || '127.0.0.1',
        details: { requiredRoles: roles, userRole: req.user?.role },
      }).catch(() => {});

      return res.status(403).json({
        success: false,
        message: `Forbidden: Role "${req.user?.role}" is not authorized for this resource.`,
      });
    }
    next();
  };
}

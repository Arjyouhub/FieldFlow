import mongoose from 'mongoose';

const securityEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: [
        'FAILED_LOGIN',
        'OTP_FAILURE',
        'UNAUTHORIZED_ACCESS',
        'RATE_LIMIT_TRIGGERED',
        'SESSION_REVOKED',
        'ACCOUNT_LOCKED',
        'SUSPICIOUS_GPS',
        'CONFIG_CHANGED',
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    actor: {
      identifier: { type: String, default: 'anonymous' },
      role: { type: String, default: 'guest' },
    },
    endpoint: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isResolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);

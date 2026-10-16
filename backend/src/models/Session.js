import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: 'Unknown Device',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    deviceType: {
      type: String,
      default: 'Android / Web',
    },
    isValid: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ userId: 1, isValid: 1 });

export const Session = mongoose.model('Session', sessionSchema);

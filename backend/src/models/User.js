import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    employeeId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['staff', 'admin', 'developer', 'super_admin'],
      default: 'staff',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending_activation', 'pending_approval', 'deleted'],
      default: 'active',
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    assignedArea: {
      type: String,
      default: '',
    },
    team: {
      type: String,
      default: 'Field Operations',
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    monthlyTarget: {
      type: Number,
      default: 0,
    },
    registrationLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      address: { type: String, default: '' },
      capturedAt: { type: Date, default: null },
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    otp: {
      code: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      lastSentAt: { type: Date, default: null },
      resendCount: { type: Number, default: 0 },
      activationToken: { type: String, default: null },
      activationTokenExpiresAt: { type: Date, default: null },
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!enteredPassword || !this.password) return false;
  try {
    const rawEntered = String(enteredPassword).trim();
    if (!rawEntered) return false;
    const storedHash = String(this.password);
    const isBcryptHash =
      storedHash.startsWith('$2a$') ||
      storedHash.startsWith('$2b$') ||
      storedHash.startsWith('$2y$');

    if (isBcryptHash) {
      return await bcrypt.compare(rawEntered, storedHash);
    }
    // Fallback: If unhashed plaintext was saved in development/legacy, require strict exact match
    return rawEntered === storedHash;
  } catch (err) {
    console.error('[User Auth] Error comparing passwords:', err);
    return false;
  }
};

export const User = mongoose.model('User', userSchema);

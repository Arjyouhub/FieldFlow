import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { AuditLog } from '../models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fieldflow_secure_jwt_secret_dev_key_2026', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export async function login(req, res) {
  try {
    const { phoneOrEmail, phone, email, password, deviceType } = req.body;
    const identifier = (phoneOrEmail || phone || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number/email and password.',
      });
    }

    const cleanedDigits = identifier.replace(/[^\d]/g, '');
    const user = await User.findOne({
      $or: [
        { phone: identifier },
        ...(cleanedDigits ? [{ phone: cleanedDigits }, { phone: cleanedDigits.slice(-10) }] : []),
        { email: identifier.toLowerCase() },
      ],
    });

    if (!user) {
      await SecurityEvent.create({
        eventType: 'FAILED_LOGIN',
        severity: 'LOW',
        actor: { identifier, role: 'unknown' },
        endpoint: '/api/auth/login',
        ipAddress: req.ip || '127.0.0.1',
        details: { reason: 'User not found' },
      }).catch(() => {});

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    if (user.status !== 'active') {
      if (user.status === 'pending_approval') {
        return res.status(403).json({
          success: false,
          status: 'pending_approval',
          message: 'Your registration is under review by the Administrator. You can log in once approved.',
        });
      }
      return res.status(403).json({
        success: false,
        status: user.status,
        message: user.rejectionReason
          ? `Registration was declined: ${user.rejectionReason}`
          : `Account is ${user.status}. Please contact administrator.`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      await user.save();

      await SecurityEvent.create({
        eventType: 'FAILED_LOGIN',
        severity: user.failedLoginAttempts > 3 ? 'HIGH' : 'LOW',
        actor: { identifier: user.phone, role: user.role },
        endpoint: '/api/auth/login',
        ipAddress: req.ip || '127.0.0.1',
        details: { attempts: user.failedLoginAttempts },
      }).catch(() => {});

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    // Reset failed login attempts on success
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id);

    // Create session record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Session.create({
      userId: user._id,
      token,
      userAgent: req.headers['user-agent'] || 'Unknown Agent',
      ipAddress: req.ip || '127.0.0.1',
      deviceType: deviceType || (req.headers['user-agent']?.includes('okhttp') ? 'Android App' : 'Web Browser'),
      expiresAt,
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        employeeId: user.employeeId,
        phone: user.phone,
        email: user.email,
        role: user.role,
        assignedArea: user.assignedArea,
        team: user.team,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
}

// Staff Account Activation / Password Reset OTP Request
export async function requestOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const user = await User.findOne({ phone: phone.trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered user found with this mobile number.' });
    }

    // Generate secure 6-digit OTP (for dev / demo, fixed or simulated)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = { code, expiresAt, attempts: 0 };
    await user.save();

    // Log for development / testing visibility
    console.log(`[FieldFlow OTP Service] Generated OTP for ${phone}: ${code} (expires in 10 mins)`);

    return res.json({
      success: true,
      message: 'Verification OTP generated successfully. (Check terminal/SMS in development)',
      // We pass simulatedOtp in non-production for frictionless testing
      devOtp: process.env.NODE_ENV !== 'production' ? code : undefined,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Verify OTP and reset password or activate account
export async function verifyOtpAndSetPassword(req, res) {
  try {
    const { phone, otp, newPassword } = req.body;

    if (!phone || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, OTP, and new password are required.',
      });
    }

    const user = await User.findOne({ phone: phone.trim() });
    if (!user || !user.otp?.code) {
      return res.status(400).json({ success: false, message: 'Invalid OTP request or expired.' });
    }

    if (new Date() > new Date(user.otp.expiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (user.otp.code !== otp.trim()) {
      user.otp.attempts = (user.otp.attempts || 0) + 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please check and try again.' });
    }

    // Set new password
    user.password = newPassword;
    user.otp = { code: null, expiresAt: null, attempts: 0 };
    if (user.status === 'pending_activation') {
      user.status = 'active';
    }
    await user.save();

    // Invalidate existing sessions for security
    await Session.updateMany({ userId: user._id }, { isValid: false });

    return res.json({
      success: true,
      message: 'Password set successfully! You can now log in with your new credentials.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Direct Login using 6-Digit Mobile OTP
export async function verifyOtpLogin(req, res) {
  try {
    const { phone, otp, deviceType } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP are required.' });
    }

    const user = await User.findOne({ phone: phone.trim() });
    if (!user || !user.otp?.code) {
      return res.status(400).json({ success: false, message: 'Invalid OTP request or expired.' });
    }

    if (new Date() > new Date(user.otp.expiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (user.otp.code !== otp.trim()) {
      user.otp.attempts = (user.otp.attempts || 0) + 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please check and try again.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: user.status === 'pending_approval'
          ? 'Registration under review by Administrator.'
          : `Account is ${user.status}.`,
      });
    }

    user.otp = { code: null, expiresAt: null, attempts: 0 };
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id);

    return res.json({
      success: true,
      message: 'OTP Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        employeeId: user.employeeId,
        phone: user.phone,
        email: user.email,
        role: user.role,
        assignedArea: user.assignedArea,
        team: user.team,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function logout(req, res) {
  try {
    if (req.token) {
      await Session.updateOne({ token: req.token }, { isValid: false });
    }
    return res.json({ success: true, message: 'Successfully logged out.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getMe(req, res) {
  return res.json({
    success: true,
    user: req.user,
  });
}

// Development helper to seed demo initial accounts, portfolios, batches, cases
export async function seedInitialUsers(req, res) {
  try {
    const { runMasterSeed } = await import('../scripts/seed.js');
    await runMasterSeed();

    return res.json({
      success: true,
      message: 'Initial demo accounts, portfolios, monthly batches, and cases created successfully.',
      users: [
        { role: 'admin', phone: '9876543210', password: 'password123' },
        { role: 'staff', phone: '9876543211', password: 'password123', name: 'Rahul Kumar' },
        { role: 'staff', phone: '9876543213', password: 'password123', name: 'Priya Sharma' },
        { role: 'developer', phone: '9876543212', password: 'password123' },
      ],
      portfolios: ['KREDITBEE', 'MONEYSMART', 'SMARTCOIN', 'OTHERFIN'],
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Field Staff Self-Registration from Mobile App
 */
export async function registerStaff(req, res) {
  try {
    const {
      name,
      phone,
      password,
      email,
      assignedArea,
      employeeId,
      profilePhoto,
      location, // { lat, lng, address }
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Mobile number or email ID is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const trimmedInput = phone.trim();
    const isEmail = trimmedInput.includes('@');
    const cleanPhone = isEmail
      ? `EML-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`
      : trimmedInput.replace(/[^\d+]/g, '');
    const cleanEmail = isEmail ? trimmedInput.toLowerCase() : (email ? email.trim().toLowerCase() : undefined);

    const existing = await User.findOne({
      $or: [
        ...(isEmail && cleanEmail ? [{ email: cleanEmail }] : []),
        ...(!isEmail && cleanPhone ? [{ phone: cleanPhone }] : []),
      ],
    });
    if (existing) {
      if (existing.status === 'pending_approval') {
        return res.status(409).json({
          success: false,
          status: 'pending_approval',
          message: 'Your registration has already been submitted and is waiting for administrator approval.',
        });
      }
      return res.status(409).json({
        success: false,
        message: 'This mobile number or email ID is already registered. Please login or reset your password.',
      });
    }

    // Process profile photo / selfie if sent as base64
    let savedPhotoUrl = '';
    if (profilePhoto && profilePhoto.startsWith('data:image')) {
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const base64Data = profilePhoto.replace(/^data:image\/\w+;base64,/, '');
        const filename = `selfie-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
        savedPhotoUrl = `/uploads/${filename}`;
      } catch (photoErr) {
        console.warn('Could not save base64 selfie to disk:', photoErr);
      }
    } else if (profilePhoto) {
      savedPhotoUrl = profilePhoto;
    }

    // Generate unique employee ID if not provided
    const autoEmployeeId =
      employeeId && employeeId.trim()
        ? employeeId.trim()
        : `STF-${cleanPhone.slice(-4)}`;

    const newUser = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      password,
      email: email ? email.trim().toLowerCase() : undefined,
      employeeId: autoEmployeeId,
      assignedArea: assignedArea ? assignedArea.trim() : 'Kozhikode Central',
      team: 'Field Operations',
      role: 'staff',
      status: 'pending_approval',
      profilePhoto: savedPhotoUrl,
      registrationLocation: {
        lat: location?.lat || null,
        lng: location?.lng || null,
        address: location?.address || '',
        capturedAt: new Date(),
      },
    });

    await AuditLog.create({
      actorId: newUser._id,
      actorName: newUser.name,
      actorRole: 'staff',
      action: 'STAFF_SELF_REGISTER',
      entityType: 'User',
      entityId: newUser._id.toString(),
      details: {
        phone: cleanPhone,
        assignedArea: newUser.assignedArea,
        location: newUser.registrationLocation,
      },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Your account will be activated once approved by the administrator.',
      user: {
        id: newUser._id,
        name: newUser.name,
        phone: newUser.phone,
        status: newUser.status,
        assignedArea: newUser.assignedArea,
        profilePhoto: newUser.profilePhoto,
        registrationLocation: newUser.registrationLocation,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Request Account Activation OTP for existing Field Staff records
 */
export async function requestActivationOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        code: 'PHONE_REQUIRED',
        message: 'Registered mobile number is required.',
      });
    }

    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    const user = await User.findOne({
      $or: [{ phone: cleanPhone }, { phone: cleanPhone.replace(/^\+91/, '') }],
    });

    // 1. Link activation strictly to an existing record
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'STAFF_NOT_FOUND',
        message: 'No staff record found for this mobile number. Please contact your FieldFlow administrator to register your account.',
      });
    }

    // 2. Prevent privilege escalation (only staff allowed)
    if (user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        code: 'PRIVILEGE_RESTRICTED',
        message: 'Account activation via mobile app is only permitted for Field Staff. Administrative accounts must be configured by Super Admin.',
      });
    }

    // 3. Status checks
    if (user.status === 'suspended' || user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DISABLED',
        message: 'This staff account has been deactivated or suspended. Please contact your administrator.',
      });
    }

    if (user.status === 'pending_approval') {
      return res.status(403).json({
        success: false,
        code: 'PENDING_APPROVAL',
        message: 'Your staff account is currently awaiting administrator review and approval. You can activate your account once approved.',
      });
    }

    // 4. Rate Limiting & Resend Limits
    const now = Date.now();
    const lastSent = user.otp?.lastSentAt ? new Date(user.otp.lastSentAt).getTime() : 0;
    const cooldownMs = 30 * 1000; // 30 seconds cooldown between resends

    if (lastSent && (now - lastSent) < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - (now - lastSent)) / 1000);
      return res.status(429).json({
        success: false,
        code: 'COOLDOWN_ACTIVE',
        message: `Please wait ${waitSec} seconds before requesting a new verification code.`,
        retryAfter: waitSec,
      });
    }

    // Limit to 5 requests per hour
    const oneHourAgo = now - (60 * 60 * 1000);
    let resendCount = user.otp?.resendCount || 0;
    if (lastSent && lastSent < oneHourAgo) {
      resendCount = 0; // reset hourly bucket
    }
    if (resendCount >= 5) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Maximum verification code requests exceeded for this hour. Please try again later or contact support.',
      });
    }

    // 5. Generate secure 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(now + 10 * 60 * 1000); // 10 minutes expiry

    user.otp = {
      code,
      expiresAt,
      attempts: 0,
      lastSentAt: new Date(now),
      resendCount: resendCount + 1,
      activationToken: null,
      activationTokenExpiresAt: null,
    };
    await user.save();

    // 6. Check SMS Provider Integration
    const hasSmsIntegration = Boolean(
      (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ||
      process.env.SMS_API_KEY ||
      process.env.FAST2SMS_KEY
    );

    if (!hasSmsIntegration) {
      if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_OTP) {
        return res.status(503).json({
          success: false,
          code: 'SMS_GATEWAY_UNAVAILABLE',
          message: 'SMS provider integration is not configured on this server. Please contact your system administrator to enable SMS service.',
          missingIntegration: 'Telephony / SMS Gateway (Twilio / MSG91 / Fast2SMS)',
        });
      }
    }

    console.log(`[FieldFlow Activation] OTP for ${cleanPhone} (${user.name}): ${code}`);

    return res.json({
      success: true,
      message: hasSmsIntegration
        ? `Verification code sent to +91 ${cleanPhone.slice(-10)}`
        : `Verification code generated. (SMS gateway unconfigured in development)`,
      staff: {
        name: user.name,
        phone: cleanPhone,
        employeeId: user.employeeId || `STF-${cleanPhone.slice(-4)}`,
        assignedArea: user.assignedArea || 'Field Operations',
      },
      devOtp: !hasSmsIntegration || process.env.NODE_ENV !== 'production' ? code : undefined,
      expiresInSeconds: 600,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Validate Activation OTP on Backend (Expiry, Attempt Limits)
 */
export async function verifyActivationOtp(req, res) {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Phone number and 6-digit OTP code are required.',
      });
    }

    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    const user = await User.findOne({
      $or: [{ phone: cleanPhone }, { phone: cleanPhone.replace(/^\+91/, '') }],
    });

    if (!user || !user.otp?.code) {
      return res.status(400).json({
        success: false,
        code: 'NO_PENDING_OTP',
        message: 'No pending verification code found. Please request a new code.',
      });
    }

    // 1. Expiry Check
    if (new Date() > new Date(user.otp.expiresAt)) {
      return res.status(400).json({
        success: false,
        code: 'OTP_EXPIRED',
        message: 'The verification code has expired. Please request a new one.',
      });
    }

    // 2. Attempt Limits (Max 5 attempts)
    const currentAttempts = (user.otp.attempts || 0) + 1;
    if (currentAttempts > 5) {
      user.otp.code = null;
      user.otp.expiresAt = null;
      await user.save();
      return res.status(400).json({
        success: false,
        code: 'OTP_LOCKED',
        message: 'Too many incorrect attempts. This verification code has been locked. Please request a new code.',
      });
    }

    // 3. Code Match
    if (user.otp.code !== otp.trim()) {
      user.otp.attempts = currentAttempts;
      await user.save();
      const remaining = 5 - currentAttempts;
      return res.status(400).json({
        success: false,
        code: 'INVALID_OTP',
        message: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code locked.'}`,
        remainingAttempts: Math.max(0, remaining),
      });
    }

    // 4. Verification Successful -> Issue 15-minute Activation Token
    const activationToken = jwt.sign(
      { id: user._id, phone: user.phone, action: 'ACTIVATE_ACCOUNT' },
      process.env.JWT_SECRET || 'fieldflow_secure_jwt_secret_dev_key_2026',
      { expiresIn: '15m' }
    );

    user.otp.activationToken = activationToken;
    user.otp.activationTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.otp.code = null; // Clear OTP once successfully verified
    await user.save();

    return res.json({
      success: true,
      message: 'Mobile number verified successfully! You may now set your secure password.',
      activationToken,
      staff: {
        name: user.name,
        employeeId: user.employeeId,
        phone: user.phone,
        assignedArea: user.assignedArea,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Complete Staff Account Activation & Set Password
 */
export async function completeActivation(req, res) {
  try {
    const { phone, activationToken, newPassword } = req.body;

    if (!phone || !activationToken || !newPassword) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Phone number, verification token, and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        code: 'PASSWORD_TOO_SHORT',
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(
        activationToken,
        process.env.JWT_SECRET || 'fieldflow_secure_jwt_secret_dev_key_2026'
      );
    } catch {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Activation session has expired. Please verify your mobile number again.',
      });
    }

    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    const user = await User.findById(decoded.id);

    if (!user || user.role !== 'staff') {
      return res.status(404).json({
        success: false,
        code: 'STAFF_NOT_FOUND',
        message: 'Staff account not found or unauthorized.',
      });
    }

    if (user.status === 'pending_approval') {
      return res.status(403).json({
        success: false,
        code: 'PENDING_APPROVAL',
        message: 'Account requires administrator approval before activation can be completed.',
      });
    }

    // Update password & activate account
    user.password = newPassword;
    user.status = 'active';
    user.otp = {
      code: null,
      expiresAt: null,
      attempts: 0,
      lastSentAt: null,
      resendCount: 0,
      activationToken: null,
      activationTokenExpiresAt: null,
    };
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    await user.save();

    // Generate authenticated login session token
    const token = generateToken(user._id);

    await AuditLog.create({
      actorId: user._id,
      actorName: user.name,
      actorRole: 'staff',
      action: 'STAFF_ACCOUNT_ACTIVATED',
      entityType: 'User',
      entityId: user._id.toString(),
      details: {
        phone: user.phone,
        activatedAt: new Date(),
      },
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Account successfully activated! Welcome to FieldFlow.',
      token,
      user: {
        id: user._id,
        name: user.name,
        employeeId: user.employeeId,
        phone: user.phone,
        email: user.email,
        role: user.role,
        assignedArea: user.assignedArea,
        team: user.team,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}


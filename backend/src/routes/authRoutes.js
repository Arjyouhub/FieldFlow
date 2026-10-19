import express from 'express';
import {
  login,
  getMe,
  requestOtp,
  verifyOtpAndSetPassword,
  verifyOtpLogin,
  logout,
  seedInitialUsers,
  registerStaff,
  requestActivationOtp,
  verifyActivationOtp,
  completeActivation,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/register-staff', registerStaff);
router.post('/request-otp', requestOtp);
router.post('/verify-otp-password', verifyOtpAndSetPassword);
router.post('/verify-otp-login', verifyOtpLogin);

// Account Activation Routes
router.post('/activate/request-otp', requestActivationOtp);
router.post('/activate/verify-otp', verifyActivationOtp);
router.post('/activate/set-password', completeActivation);

router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/seed-initial-users', seedInitialUsers);

export default router;

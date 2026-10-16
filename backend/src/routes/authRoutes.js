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
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/register-staff', registerStaff);
router.post('/request-otp', requestOtp);
router.post('/verify-otp-password', verifyOtpAndSetPassword);
router.post('/verify-otp-login', verifyOtpLogin);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/seed-initial-users', seedInitialUsers);

export default router;

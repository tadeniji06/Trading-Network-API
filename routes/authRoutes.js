const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  googleAuth,
  googleCallback,
  getMe,
  logout,
  requestPasswordReset,
  resetPassword
} = require('../controllers/authController');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);

// Password reset routes
router.post('/requestReset', requestPasswordReset);
router.post('/resetPassword', resetPassword);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  getMe,
  logout
} = require('../controllers/authController');

// Routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', getMe);
router.get('/logout', logout);

module.exports = router;

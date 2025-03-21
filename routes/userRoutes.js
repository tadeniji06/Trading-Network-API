const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  completeOnboarding,
  getUserProfile,
  updateUserProfile
} = require('../controllers/userController');

// User routes
router.post('/onboarding', protect, completeOnboarding);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Import controllers
const {
  getGlobalLeaderboard,
  getFriendsLeaderboard,
  getDailyGainers,
  getWeeklyGainers,
  getMonthlyGainers
} = require('../controllers/leaderboardController');

// Protect all routes
router.use(protect);

// Leaderboard routes
router.get('/global', getGlobalLeaderboard);
router.get('/friends', getFriendsLeaderboard);
router.get('/daily', getDailyGainers);
router.get('/weekly', getWeeklyGainers);
router.get('/monthly', getMonthlyGainers);

module.exports = router;

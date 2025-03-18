const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Import controllers
const {
  getPerformanceMetrics,
  getTradeStatistics,
  getProfitLossChart,
  getPortfolioHistory,
  getCoinPerformance,
  getComparisonWithFriends
} = require('../controllers/analyticsController');

// Protect all routes
router.use(protect);

// Analytics routes
router.get('/performance', getPerformanceMetrics);
router.get('/statistics', getTradeStatistics);
router.get('/profit-loss', getProfitLossChart);
router.get('/portfolio-history', getPortfolioHistory);
router.get('/coin/:coinId', getCoinPerformance);
router.get('/comparison', getComparisonWithFriends);

module.exports = router;

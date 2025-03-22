const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  executeMarketTrade,
  placeOrder,
  getOrders,
  cancelOrder,
  getPortfolio,
  getTradeHistory,
  getMarketData,
  getCoinDetails,
  searchCoins,
  closePosition,
} = require('../controllers/tradeController');

// Protect all routes
router.use(protect);

// Trade routes
router.post('/market', executeMarketTrade);
router.post('/order', placeOrder);
router.get('/orders', getOrders);
router.delete('/orders/:id', cancelOrder);
router.get('/portfolio', getPortfolio);
router.get('/history', getTradeHistory);
router.get('/market', getMarketData);
router.get('/coins/:id', getCoinDetails);
router.get('/search', searchCoins);
router.post('/close-position', closePosition);

module.exports = router;

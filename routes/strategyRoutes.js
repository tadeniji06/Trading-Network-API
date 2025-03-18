const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Import controllers
const {
  createStrategy,
  getStrategies,
  getStrategy,
  updateStrategy,
  deleteStrategy,
  activateStrategy,
  deactivateStrategy,
  getStrategyPerformance
} = require('../controllers/strategyController');

// Protect all routes
router.use(protect);

// Strategy routes
router.post('/', createStrategy);
router.get('/', getStrategies);
router.get('/:id', getStrategy);
router.put('/:id', updateStrategy);
router.delete('/:id', deleteStrategy);
router.put('/:id/activate', activateStrategy);
router.put('/:id/deactivate', deactivateStrategy);
router.get('/:id/performance', getStrategyPerformance);

module.exports = router;

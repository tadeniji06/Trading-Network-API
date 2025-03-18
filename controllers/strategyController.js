const Strategy = require('../models/Strategy');
const Trade = require('../models/Trade');
const coinGeckoService = require('../services/coinGeckoService');

// @desc    Create a new trading strategy
// @route   POST /api/strategies
// @access  Private
exports.createStrategy = async (req, res, next) => {
  try {
    const {
      name,
      description,
      coinId,
      coinSymbol,
      type,
      conditions,
      actions
    } = req.body;
    
    // Validate required fields
    if (!name || !coinId || !coinSymbol || !type || !conditions || !actions) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }
    
    // Validate conditions
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one condition'
      });
    }
    
    // Validate actions
    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one action'
      });
    }
    
    // Create strategy
    const strategy = await Strategy.create({
      user: req.user.id,
      name,
      description,
      coinId,
      coinSymbol,
      type,
      conditions,
      actions,
      active: true
    });
    
    res.status(201).json({
      success: true,
      data: strategy
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all strategies for the current user
// @route   GET /api/strategies
// @access  Private
exports.getStrategies = async (req, res, next) => {
  try {
    const strategies = await Strategy.find({ user: req.user.id });
    
    res.status(200).json({
      success: true,
      count: strategies.length,
      data: strategies
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get a single strategy
// @route   GET /api/strategies/:id
// @access  Private
exports.getStrategy = async (req, res, next) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }
    
    // Check if strategy belongs to user
    if (strategy.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this strategy'
      });
    }
    
    res.status(200).json({
      success: true,
      data: strategy
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a strategy
// @route   PUT /api/strategies/:id
// @access  Private
exports.updateStrategy = async (req, res, next) => {
  try {
    let strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }
    
    // Check if strategy belongs to user
    if (strategy.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this strategy'
      });
    }
    
    // Update fields
    const {
      name,
      description,
      coinId,
      coinSymbol,
      type,
      conditions,
      actions,
      active
    } = req.body;
    
    if (name) strategy.name = name;
    if (description !== undefined) strategy.description = description;
    if (coinId) strategy.coinId = coinId;
    if (coinSymbol) strategy.coinSymbol = coinSymbol;
    if (type) strategy.type = type;
    if (conditions) strategy.conditions = conditions;
    if (actions) strategy.actions = actions;
    if (active !== undefined) strategy.active = active;
    
    await strategy.save();
    
    res.status(200).json({
      success: true,
      data: strategy
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a strategy
// @route   DELETE /api/strategies/:id
// @access  Private
exports.deleteStrategy = async (req, res, next) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }
    
    // Check if strategy belongs to user
    if (strategy.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this strategy'
      });
    }
    
    await strategy.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Activate a strategy
// @route   PUT /api/strategies/:id/activate
// @access  Private
exports.activateStrategy = async (req, res, next) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }
    
    // Check if strategy belongs to user
    if (strategy.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to activate this strategy'
      });
    }
    
    // Activate strategy
    strategy.active = true;
    await strategy.save();
    
    res.status(200).json({
      success: true,
      data: strategy
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Deactivate a strategy
// @route   PUT /api/strategies/:id/deactivate
// @access  Private
exports.deactivateStrategy = async (req, res, next) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }
    
    // Check if strategy belongs to user
    if (strategy.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to deactivate this strategy'
      });
    }
    
    // Deactivate strategy
    strategy.active = false;
    await strategy.save();
    
    res.status(200).json({
      success: true,
      data: strategy
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get strategy performance
// @route   GET /api/strategies/:id/performance
// @access  Private
exports.getStrategyPerformance = async (req, res, next) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }
    
    // Check if strategy belongs to user
    if (strategy.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this strategy'
      });
    }
    
    // Get trades executed by this strategy
    const trades = await Trade.find({
      user: req.user.id,
      strategy: strategy._id,
      status: 'completed'
    }).sort({ createdAt: -1 });
    
    // Calculate performance metrics
    const executedTrades = trades.length;
    let successfulTrades = 0;
    let totalProfit = 0;
    
    trades.forEach(trade => {
      if (trade.profit && trade.profit > 0) {
        successfulTrades++;
        totalProfit += trade.profit;
      } else if (trade.profit) {
        totalProfit += trade.profit;
      }
    });
    
    const successRate = executedTrades > 0 ? (successfulTrades / executedTrades) * 100 : 0;
    
    // Get current market conditions
    let currentPrice = 0;
    try {
      currentPrice = await coinGeckoService.getCoinPrice(strategy.coinId);
    } catch (error) {
      console.error(`Error getting price for ${strategy.coinId}:`, error);
    }
    
    // Check if strategy conditions are currently met
    let conditionsMet = false;
    if (currentPrice > 0) {
      conditionsMet = evaluateStrategyConditions(strategy, { price: currentPrice });
    }
    
    res.status(200).json({
      success: true,
      data: {
        executedTrades,
        successfulTrades,
        successRate,
        totalProfit,
        currentPrice,
        conditionsMet,
        recentTrades: trades.slice(0, 10) // Return the 10 most recent trades
      }
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to evaluate strategy conditions
const evaluateStrategyConditions = (strategy, marketData) => {
  // Check if all conditions are met
  return strategy.conditions.every(condition => {
    const { indicator, operator, value } = condition;
    const marketValue = marketData[indicator];
    
    if (marketValue === undefined) {
      return false;
    }
    
    switch (operator) {
      case '>':
        return marketValue > value;
      case '<':
        return marketValue < value;
      case '>=':
        return marketValue >= value;
      case '<=':
        return marketValue <= value;
      case '==':
        return marketValue === value;
      default:
        return false;
    }
  });
};

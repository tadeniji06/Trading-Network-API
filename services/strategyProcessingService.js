const Strategy = require('../models/Strategy');
const User = require('../models/User');
const Trade = require('../models/Trade');
const coinGeckoService = require('./coinGeckoService');
const socketService = require('./socketService');

// Process all active strategies
const processStrategies = async () => {
  try {
    console.log('Processing active strategies...');
    
    // Get all active strategies
    const strategies = await Strategy.find({ active: true });
    
    if (strategies.length === 0) {
      return;
    }
    
    console.log(`Found ${strategies.length} active strategies`);
    
    // Group strategies by coinId to minimize API calls
    const strategiesByCoin = {};
    strategies.forEach(strategy => {
      if (!strategiesByCoin[strategy.coinId]) {
        strategiesByCoin[strategy.coinId] = [];
      }
      strategiesByCoin[strategy.coinId].push(strategy);
    });
    
    // Process strategies for each coin
    for (const [coinId, coinStrategies] of Object.entries(strategiesByCoin)) {
      try {
        // Get current market data
        const price = await coinGeckoService.getCoinPrice(coinId);
        
        if (!price) {
          console.log(`Failed to get price for ${coinId}, skipping strategies`);
          continue;
        }
        
        const marketData = {
          price,
          // Add other market data as needed
        };
        
        // Process each strategy
        for (const strategy of coinStrategies) {
          await processStrategy(strategy, marketData);
        }
      } catch (error) {
        console.error(`Error processing strategies for ${coinId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in strategy processing service:', error);
  }
};

// Process a single strategy
const processStrategy = async (strategy, marketData) => {
  try {
    // Check if conditions are met
    const conditionsMet = evaluateStrategyConditions(strategy, marketData);
    
    if (!conditionsMet) {
      return;
    }
    
    console.log(`Strategy ${strategy.name} conditions met for ${strategy.coinSymbol}`);
    
    // Get user
    const user = await User.findById(strategy.user);
    
    if (!user) {
      console.error(`User not found for strategy ${strategy._id}`);
      return;
    }
    
    // Execute actions
    for (const action of strategy.actions) {
      await executeStrategyAction(strategy, action, user, marketData);
    }
  } catch (error) {
    console.error(`Error processing strategy ${strategy._id}:`, error);
  }
};

// Execute a strategy action
const executeStrategyAction = async (strategy, action, user, marketData) => {
  try {
    const { type, quantity } = action;
    const { coinId, coinSymbol } = strategy;
    const price = marketData.price;
    
    // Calculate total cost/proceeds
    const total = price * quantity;
    
    // For buy actions, check if user has enough balance
    if (type === 'buy' && user.portfolio.balance < total) {
      console.log(`Insufficient funds for strategy ${strategy._id} buy action`);
      return;
    }
    
    // For sell actions, check if user has enough of the coin
    if (type === 'sell') {
      const holding = user.portfolio.holdings.find(h => h.coinId === coinId);
      
      if (!holding || holding.quantity < quantity) {
        console.log(`Insufficient ${coinSymbol} for strategy ${strategy._id} sell action`);
        return;
      }
    }
    
    // Create trade record
    const trade = await Trade.create({
      user: user._id,
      strategy: strategy._id,
      coinId,
      coinSymbol,
      type,
      quantity,
      price,
      total,
      status: 'completed',
      orderType: 'market'
    });
    
    // Update user's portfolio
    if (type === 'buy') {
      // Update balance
      user.portfolio.balance -= total;
      
      // Update holdings
      const existingHolding = user.portfolio.holdings.find(h => h.coinId === coinId);
      
      if (existingHolding) {
        // Calculate new average buy price
        const totalValue = existingHolding.quantity * existingHolding.averageBuyPrice + total;
        const newQuantity = existingHolding.quantity + quantity;
        
        existingHolding.averageBuyPrice = totalValue / newQuantity;
        existingHolding.quantity = newQuantity;
      } else {
        // Add new holding
        user.portfolio.holdings.push({
          coinId,
          coinSymbol,
          quantity,
          averageBuyPrice: price
        });
      }
    } else if (type === 'sell') {
      // Update balance
      user.portfolio.balance += total;
      
      // Update holdings
      const existingHolding = user.portfolio.holdings.find(h => h.coinId === coinId);
      
      existingHolding.quantity -= quantity;
      
      // Remove holding if quantity is 0
      if (existingHolding.quantity === 0) {
        user.portfolio.holdings = user.portfolio.holdings.filter(
          h => h.coinId !== coinId
        );
      }
      
      // Calculate profit/loss for this trade
      const profit = total - (quantity * existingHolding.averageBuyPrice);
      trade.profit = profit;
      await trade.save();
      
      // Update strategy performance
      strategy.performance.executedTrades += 1;
      if (profit > 0) {
        strategy.performance.successfulTrades += 1;
      }
      strategy.performance.totalProfit += profit;
      await strategy.save();
    }

    socketService.emitToUser(user._id.toString(), 'strategy-executed', {
      strategyId: strategy._id,
      tradeId: trade._id,
      type: type,
      coinSymbol: coinSymbol,
      quantity: quantity,
      price: price,
      total: total
    });
    
    // Add to user's history
    user.portfolio.history.unshift({
      tradeId: trade._id,
      coinId,
      coinSymbol,
      type,
      quantity,
      price,
      total,
      date: Date.now()
    });
    
    // Limit history to last 50 trades
    if (user.portfolio.history.length > 50) {
      user.portfolio.history = user.portfolio.history.slice(0, 50);
    }
    
    await user.save();
    
    console.log(`Successfully executed ${type} action for strategy ${strategy._id}`);
  } catch (error) {
    console.error(`Error executing strategy action:`, error);
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

// Start the strategy processing service
const startStrategyProcessing = () => {
  // Process strategies every 5 minutes
  setInterval(processStrategies, 5 * 60 * 1000);
  
  // Also process immediately on startup
  processStrategies();
  
  console.log('Strategy processing service started');
};

module.exports = { startStrategyProcessing };

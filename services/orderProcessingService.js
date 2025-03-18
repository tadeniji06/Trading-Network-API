const Trade = require('../models/Trade');
const User = require('../models/User');
const coinGeckoService = require('./coinGeckoService');

// Process all pending orders
const processOrders = async () => {
  try {
    console.log('Processing pending orders...');
    
    // Get all pending orders
    const pendingOrders = await Trade.find({ status: 'pending' });
    
    if (pendingOrders.length === 0) {
      return;
    }
    
    console.log(`Found ${pendingOrders.length} pending orders`);
    
    // Group orders by coinId to minimize API calls
    const ordersByCoin = {};
    pendingOrders.forEach(order => {
      if (!ordersByCoin[order.coinId]) {
        ordersByCoin[order.coinId] = [];
      }
      ordersByCoin[order.coinId].push(order);
    });
    
    // Process orders for each coin
    for (const [coinId, orders] of Object.entries(ordersByCoin)) {
      try {
        // Get current price
        const currentPrice = await coinGeckoService.getCoinPrice(coinId);
        
        if (!currentPrice) {
          console.log(`Failed to get price for ${coinId}, skipping orders`);
          continue;
        }
        
        // Process each order
        for (const order of orders) {
          await processOrder(order, currentPrice);
        }
      } catch (error) {
        console.error(`Error processing orders for ${coinId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in order processing service:', error);
  }
};

// Process a single order
const processOrder = async (order, currentPrice) => {
  try {
    // Check if order should be executed
    let shouldExecute = false;
    
    if (order.orderType === 'limit') {
      // Execute limit buy when price falls below limit price
      if (order.type === 'buy' && currentPrice <= order.limitPrice) {
        shouldExecute = true;
      }
      // Execute limit sell when price rises above limit price
      else if (order.type === 'sell' && currentPrice >= order.limitPrice) {
        shouldExecute = true;
      }
    } else if (order.orderType === 'stop') {
      // Execute stop buy when price rises above stop price
      if (order.type === 'buy' && currentPrice >= order.stopPrice) {
        shouldExecute = true;
      }
      // Execute stop sell when price falls below stop price
      else if (order.type === 'sell' && currentPrice <= order.stopPrice) {
        shouldExecute = true;
      }
    }
    
    if (!shouldExecute) {
      return;
    }
    
    console.log(`Executing ${order.orderType} ${order.type} order for ${order.coinSymbol}`);
    
    // Get user
    const user = await User.findById(order.user);
    
    if (!user) {
      console.error(`User not found for order ${order._id}`);
      order.status = 'failed';
      await order.save();
      return;
    }
    
    // For sell orders, check if user still has enough of the coin
    if (order.type === 'sell') {
      const holding = user.portfolio.holdings.find(h => h.coinId === order.coinId);
      
      if (!holding || holding.quantity < order.quantity) {
        console.log(`Insufficient ${order.coinSymbol} for sell order ${order._id}`);
        order.status = 'failed';
        await order.save();
        
        // If it's a failed sell, no need to refund anything
        return;
      }
      
      // Update user balance with the sale proceeds
      const saleProceeds = currentPrice * order.quantity;
      user.portfolio.balance += saleProceeds;
      
      // Update holdings
      holding.quantity -= order.quantity;
      
      // Remove holding if quantity is 0
      if (holding.quantity === 0) {
        user.portfolio.holdings = user.portfolio.holdings.filter(
          h => h.coinId !== order.coinId
        );
      }
    } 
    // For buy orders, the funds were already reserved, now update holdings
    else if (order.type === 'buy') {
      // Calculate actual cost (might be different from reserved amount for limit orders)
      const actualCost = currentPrice * order.quantity;
      
      // If it's a limit order and the actual cost is less than reserved, refund the difference
      if (order.orderType === 'limit' && actualCost < order.total) {
        const refund = order.total - actualCost;
        user.portfolio.balance += refund;
      }
      
      // Update or add to holdings
      const existingHolding = user.portfolio.holdings.find(
        h => h.coinId === order.coinId
      );
      
      if (existingHolding) {
        // Calculate new average buy price
        const totalValue = existingHolding.quantity * existingHolding.averageBuyPrice + actualCost;
        const newQuantity = existingHolding.quantity + order.quantity;
        
        existingHolding.averageBuyPrice = totalValue / newQuantity;
        existingHolding.quantity = newQuantity;
      } else {
        // Add new holding
        user.portfolio.holdings.push({
          coinId: order.coinId,
          coinSymbol: order.coinSymbol,
          quantity: order.quantity,
          averageBuyPrice: currentPrice
        });
      }
    }
    
    // Update order status and execution price
    order.status = 'completed';
    order.price = currentPrice;
    order.total = currentPrice * order.quantity;
    
    // Add to user's history
    user.portfolio.history.unshift({
      tradeId: order._id,
      coinId: order.coinId,
      coinSymbol: order.coinSymbol,
      type: order.type,
      quantity: order.quantity,
      price: currentPrice,
      total: order.total,
      date: Date.now()
    });
    
    // Limit history to last 50 trades
    if (user.portfolio.history.length > 50) {
      user.portfolio.history = user.portfolio.history.slice(0, 50);
    }
    
    // Save changes
    await Promise.all([order.save(), user.save()]);
    
    console.log(`Successfully executed order ${order._id}`);
  } catch (error) {
    console.error(`Error processing order ${order._id}:`, error);
  }
};

// Start the order processing service
const startOrderProcessing = () => {
  // Process orders every minute
  setInterval(processOrders, 60000);
  
  // Also process immediately on startup
  processOrders();
  
  console.log('Order processing service started');
};

module.exports = { startOrderProcessing };

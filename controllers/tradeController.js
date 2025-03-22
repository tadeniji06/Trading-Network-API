const User = require("../models/User");
const Trade = require("../models/Trade");
const coinGeckoService = require("../services/coinGeckoService");

// @desc    Execute a market trade
// @route   POST /api/trade/market
// @access  Private
exports.executeMarketTrade = async (req, res, next) => {
  const { coinId, coinSymbol, type, quantity } = req.body;

  if (!coinId || !coinSymbol || !type || !quantity) {
    return res.status(400).json({
      success: false,
      error: "Please provide all required fields",
    });
  }

  if (type !== "buy" && type !== "sell") {
    return res.status(400).json({
      success: false,
      error: "Trade type must be buy or sell",
    });
  }

  if (quantity <= 0) {
    return res.status(400).json({
      success: false,
      error: "Quantity must be greater than 0",
    });
  }

  try {
    // Get current price from CoinGecko
    const price = await coinGeckoService.getCoinPrice(coinId);

    if (!price) {
      return res.status(400).json({
        success: false,
        error: "Failed to get current price for this coin",
      });
    }

    const total = price * quantity;

    // Get user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Handle buy order
    if (type === "buy") {
      // Check if user has enough balance
      if (user.portfolio.balance < total) {
        return res.status(400).json({
          success: false,
          error: "Insufficient funds",
        });
      }

      // Update user balance
      user.portfolio.balance -= total;

      // Update or add to holdings
      const existingHolding = user.portfolio.holdings.find(
        (holding) => holding.coinId === coinId
      );

      if (existingHolding) {
        // Calculate new average buy price
        const totalValue =
          existingHolding.quantity * existingHolding.averageBuyPrice +
          total;
        const newQuantity = existingHolding.quantity + quantity;

        existingHolding.averageBuyPrice = totalValue / newQuantity;
        existingHolding.quantity = newQuantity;
      } else {
        // Add new holding
        user.portfolio.holdings.push({
          coinId,
          coinSymbol,
          quantity,
          averageBuyPrice: price,
        });
      }
    }
    // Handle sell order
    else if (type === "sell") {
      // Check if user has the coin and enough quantity
      const existingHolding = user.portfolio.holdings.find(
        (holding) => holding.coinId === coinId
      );

      if (!existingHolding || existingHolding.quantity < quantity) {
        return res.status(400).json({
          success: false,
          error: "Insufficient coin quantity",
        });
      }

      // Update user balance
      user.portfolio.balance += total;

      // Update holdings
      existingHolding.quantity -= quantity;

      // Remove holding if quantity is 0
      if (existingHolding.quantity === 0) {
        user.portfolio.holdings = user.portfolio.holdings.filter(
          (holding) => holding.coinId !== coinId
        );
      }
    }

    // Create trade record
    const trade = await Trade.create({
      user: user._id,
      coinId,
      coinSymbol,
      type,
      quantity,
      price,
      total,
      status: "completed",
      orderType: "market",
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
      date: Date.now(),
    });

    // Limit history to last 50 trades
    if (user.portfolio.history.length > 50) {
      user.portfolio.history = user.portfolio.history.slice(0, 50);
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: trade,
    });
  } catch (err) {
    console.error("Trade execution error:", err);
    next(err);
  }
};


// @desc    Close an existing position
// @route   POST /api/trade/close-position
// @access  Private
exports.closePosition = async (req, res, next) => {
  const { coinId, percentage = 100 } = req.body;

  if (!coinId) {
    return res.status(400).json({
      success: false,
      error: "Please provide the coinId of the position to close",
    });
  }

  // Validate percentage is between 1-100
  if (percentage <= 0 || percentage > 100) {
    return res.status(400).json({
      success: false,
      error: "Percentage must be between 1 and 100",
    });
  }

  try {
    // Get user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Find the holding
    const existingHolding = user.portfolio.holdings.find(
      (holding) => holding.coinId === coinId
    );

    if (!existingHolding || existingHolding.quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: "You don't have any holdings for this coin",
      });
    }

    // Get current price from CoinGecko
    const currentPrice = await coinGeckoService.getCoinPrice(coinId);

    if (!currentPrice) {
      return res.status(400).json({
        success: false,
        error: "Failed to get current price for this coin",
      });
    }

    // Calculate quantity to sell based on percentage
    const quantityToSell = (existingHolding.quantity * percentage) / 100;
    const roundedQuantity = Math.min(
      existingHolding.quantity,
      parseFloat(quantityToSell.toFixed(8))
    );
    
    // Calculate total value
    const total = currentPrice * roundedQuantity;

    // Calculate profit/loss
    const costBasis = existingHolding.averageBuyPrice * roundedQuantity;
    const profitLoss = total - costBasis;
    const profitLossPercentage = ((currentPrice - existingHolding.averageBuyPrice) / existingHolding.averageBuyPrice) * 100;

    // Update user balance
    user.portfolio.balance += total;

    // Update holdings
    existingHolding.quantity -= roundedQuantity;

    // Remove holding if quantity is 0 or very close to 0 (floating point precision issues)
    if (existingHolding.quantity < 0.00000001) {
      user.portfolio.holdings = user.portfolio.holdings.filter(
        (holding) => holding.coinId !== coinId
      );
    }

    // Create trade record
    const trade = await Trade.create({
      user: user._id,
      coinId,
      coinSymbol: existingHolding.coinSymbol,
      type: "sell",
      quantity: roundedQuantity,
      price: currentPrice,
      total,
      status: "completed",
      orderType: "market",
      profitLoss,
      profitLossPercentage
    });

    // Add to user's history
    user.portfolio.history.unshift({
      tradeId: trade._id,
      coinId,
      coinSymbol: existingHolding.coinSymbol,
      type: "sell",
      quantity: roundedQuantity,
      price: currentPrice,
      total,
      date: Date.now(),
      profitLoss,
      profitLossPercentage
    });

    // Limit history to last 50 trades
    if (user.portfolio.history.length > 50) {
      user.portfolio.history = user.portfolio.history.slice(0, 50);
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        trade,
        profitLoss,
        profitLossPercentage
      },
      message: `Position ${percentage < 100 ? 'partially' : 'fully'} closed with ${profitLoss >= 0 ? 'profit' : 'loss'} of $${Math.abs(profitLoss).toFixed(2)} (${profitLossPercentage.toFixed(2)}%)`,
    });
  } catch (err) {
    console.error("Close position error:", err);
    next(err);
  }
};


// @desc    Place a limit or stop order
// @route   POST /api/trade/order
// @access  Private
exports.placeOrder = async (req, res, next) => {
  const {
    coinId,
    coinSymbol,
    type,
    quantity,
    orderType,
    limitPrice,
    stopPrice,
  } = req.body;

  if (!coinId || !coinSymbol || !type || !quantity || !orderType) {
    return res.status(400).json({
      success: false,
      error: "Please provide all required fields",
    });
  }

  if (orderType === "limit" && !limitPrice) {
    return res.status(400).json({
      success: false,
      error: "Limit price is required for limit orders",
    });
  }

  if (orderType === "stop" && !stopPrice) {
    return res.status(400).json({
      success: false,
      error: "Stop price is required for stop orders",
    });
  }

  try {
    // Get current price from CoinGecko
    const currentPrice = await coinGeckoService.getCoinPrice(coinId);

    if (!currentPrice) {
      return res.status(400).json({
        success: false,
        error: "Failed to get current price for this coin",
      });
    }

    // For limit orders, check if the order can be executed immediately
    if (orderType === "limit") {
      if (
        (type === "buy" && currentPrice <= limitPrice) ||
        (type === "sell" && currentPrice >= limitPrice)
      ) {
        // Execute immediately as a market order
        req.body.orderType = "market";
        return this.executeMarketTrade(req, res, next);
      }
    }

    // For stop orders, check if the order can be executed immediately
    if (orderType === "stop") {
      if (
        (type === "buy" && currentPrice >= stopPrice) ||
        (type === "sell" && currentPrice <= stopPrice)
      ) {
        // Execute immediately as a market order
        req.body.orderType = "market";
        return this.executeMarketTrade(req, res, next);
      }
    }

    // If we're here, the order will be placed as pending
    const total =
      type === "buy"
        ? orderType === "limit"
          ? limitPrice * quantity
          : currentPrice * quantity
        : 0;

    // For buy orders, check if user has enough balance and reserve the funds
    if (type === "buy") {
      const user = await User.findById(req.user.id);

      if (user.portfolio.balance < total) {
        return res.status(400).json({
          success: false,
          error: "Insufficient funds",
        });
      }

      // Reserve the funds
      user.portfolio.balance -= total;
      await user.save();
    }

    // Create pending trade record
    const trade = await Trade.create({
      user: req.user.id,
      coinId,
      coinSymbol,
      type,
      quantity,
      price: currentPrice, // Current price for reference
      total,
      status: "pending",
      orderType,
      limitPrice: orderType === "limit" ? limitPrice : undefined,
      stopPrice: orderType === "stop" ? stopPrice : undefined,
    });

    res.status(200).json({
      success: true,
      data: trade,
      message: `${
        orderType.charAt(0).toUpperCase() + orderType.slice(1)
      } order placed successfully`,
    });
  } catch (err) {
    console.error("Order placement error:", err);
    next(err);
  }
};

// @desc    Get user's active orders
// @route   GET /api/trade/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Trade.find({
      user: req.user.id,
      status: "pending",
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel an order
// @route   DELETE /api/trade/orders/:id
// @access  Private
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Trade.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: "Not authorized to cancel this order",
      });
    }

    // Check if order is still pending
    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Cannot cancel an order that is not pending",
      });
    }

    // If it's a buy order, return the reserved funds
    if (order.type === "buy") {
      const user = await User.findById(req.user.id);
      user.portfolio.balance += order.total;
      await user.save();
    }

    // Delete the order
    await order.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's portfolio
// @route   GET /api/trade/portfolio
// @access  Private
exports.getPortfolio = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Get current prices for all holdings
    const portfolio = { ...user.portfolio };
    let totalValue = portfolio.balance;

    // If user has holdings, get current prices and calculate total value
    if (portfolio.holdings && portfolio.holdings.length > 0) {
      const coinIds = portfolio.holdings.map((holding) => holding.coinId);

      // Get current prices for all coins in one request
      const prices = {};
      const coinData = await Promise.all(
        coinIds.map((id) => coinGeckoService.getCoinPrice(id))
      );

      coinIds.forEach((id, index) => {
        prices[id] = coinData[index];
      });

      // Calculate current value and profit/loss for each holding
      portfolio.holdings = portfolio.holdings.map((holding) => {
        const currentPrice = prices[holding.coinId];
        const currentValue = currentPrice * holding.quantity;
        const profitLoss =
          currentValue - holding.averageBuyPrice * holding.quantity;
        const profitLossPercentage =
          ((currentPrice - holding.averageBuyPrice) /
            holding.averageBuyPrice) *
          100;

        totalValue += currentValue;

        return {
          ...holding.toObject(),
          currentPrice,
          currentValue,
          profitLoss,
          profitLossPercentage,
        };
      });
    }

    // Add total portfolio value
    portfolio.totalValue = totalValue;

    res.status(200).json({
      success: true,
      data: portfolio,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's trade history
// @route   GET /api/trade/history
// @access  Private
exports.getTradeHistory = async (req, res, next) => {
  try {
    const trades = await Trade.find({
      user: req.user.id,
      status: "completed",
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: trades.length,
      data: trades,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get market data
// @route   GET /api/trade/market
// @access  Private
exports.getMarketData = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;

    const marketData = await coinGeckoService.getMarketData(page, limit);

    res.status(200).json({
      success: true,
      count: marketData.length,
      data: marketData,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get coin details
// @route   GET /api/trade/coins/:id
// @access  Private
exports.getCoinDetails = async (req, res, next) => {
  try {
    const coinDetails = await coinGeckoService.getCoinDetails(
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: coinDetails,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Search coins
// @route   GET /api/trade/search
// @access  Private
exports.searchCoins = async (req, res, next) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Please provide a search query",
      });
    }

    const searchResults = await coinGeckoService.searchCoins(query);

    res.status(200).json({
      success: true,
      data: searchResults,
    });
  } catch (err) {
    next(err);
  }
};

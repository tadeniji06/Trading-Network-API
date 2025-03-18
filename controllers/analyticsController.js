const User = require('../models/User');
const Trade = require('../models/Trade');
const mongoose = require('mongoose');

// @desc    Get user performance metrics
// @route   GET /api/analytics/performance
// @access  Private
exports.getPerformanceMetrics = async (req, res, next) => {
  try {
    // Get all completed trades for the user
    const trades = await Trade.find({
      user: req.user.id,
      status: 'completed'
    });
    
    // Calculate metrics
    const totalTrades = trades.length;
    const buyTrades = trades.filter(trade => trade.type === 'buy').length;
    const sellTrades = trades.filter(trade => trade.type === 'sell').length;
    
    // Calculate profit/loss
    let totalInvested = 0;
    let totalReturned = 0;
    
    trades.forEach(trade => {
      if (trade.type === 'buy') {
        totalInvested += trade.total;
      } else {
        totalReturned += trade.total;
      }
    });
    
    const profitLoss = totalReturned - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
    
    // Get performance by coin
    const coinPerformance = {};
    trades.forEach(trade => {
      if (!coinPerformance[trade.coinId]) {
        coinPerformance[trade.coinId] = {
          coinId: trade.coinId,
          coinSymbol: trade.coinSymbol,
          buyVolume: 0,
          sellVolume: 0,
          profitLoss: 0
        };
      }
      
      if (trade.type === 'buy') {
        coinPerformance[trade.coinId].buyVolume += trade.total;
      } else {
        coinPerformance[trade.coinId].sellVolume += trade.total;
      }
      
      coinPerformance[trade.coinId].profitLoss = 
        coinPerformance[trade.coinId].sellVolume - coinPerformance[trade.coinId].buyVolume;
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalTrades,
        buyTrades,
        sellTrades,
        totalInvested,
        totalReturned,
        profitLoss,
        profitLossPercentage,
        coinPerformance: Object.values(coinPerformance)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get trade statistics
// @route   GET /api/analytics/statistics
// @access  Private
exports.getTradeStatistics = async (req, res, next) => {
  try {
    // Get all completed trades for the user
    const trades = await Trade.find({
      user: req.user.id,
      status: 'completed'
    });
    
    // Calculate trade statistics
    const tradeCount = trades.length;
    
    // Calculate average trade size
    let totalTradeValue = 0;
    trades.forEach(trade => {
      totalTradeValue += trade.total;
    });
    const averageTradeSize = tradeCount > 0 ? totalTradeValue / tradeCount : 0;
    
    // Calculate trade frequency
    if (tradeCount < 2) {
      return res.status(200).json({
        success: true,
        data: {
          tradeCount,
          averageTradeSize,
          tradesPerDay: 0,
          tradesPerWeek: 0,
          tradesPerMonth: 0,
          mostTradedCoin: null
        }
      });
    }
    
    // Sort trades by date
    trades.sort((a, b) => a.createdAt - b.createdAt);
    
    // Calculate time span in days
    const firstTradeDate = new Date(trades[0].createdAt);
    const lastTradeDate = new Date(trades[tradeCount - 1].createdAt);
    const timeSpanDays = (lastTradeDate - firstTradeDate) / (1000 * 60 * 60 * 24);
    
    // Calculate trades per day/week/month
    const tradesPerDay = timeSpanDays > 0 ? tradeCount / timeSpanDays : tradeCount;
    const tradesPerWeek = tradesPerDay * 7;
    const tradesPerMonth = tradesPerDay * 30;
    
    // Find most traded coin
    const coinCounts = {};
    trades.forEach(trade => {
      if (!coinCounts[trade.coinId]) {
        coinCounts[trade.coinId] = {
          coinId: trade.coinId,
          coinSymbol: trade.coinSymbol,
          count: 0,
          volume: 0
        };
      }
      
      coinCounts[trade.coinId].count++;
      coinCounts[trade.coinId].volume += trade.total;
    });
    
    const mostTradedCoin = Object.values(coinCounts).sort((a, b) => b.count - a.count)[0] || null;
    
    res.status(200).json({
      success: true,
      data: {
        tradeCount,
        averageTradeSize,
        tradesPerDay,
        tradesPerWeek,
        tradesPerMonth,
        mostTradedCoin
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get profit/loss chart data
// @route   GET /api/analytics/profit-loss
// @access  Private
exports.getProfitLossChart = async (req, res, next) => {
  try {
    // Get time range from query params (default to 30 days)
    const days = parseInt(req.query.days, 10) || 30;
    
    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    // Get all completed trades for the user within the time range
    const trades = await Trade.find({
      user: req.user.id,
      status: 'completed',
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });
    
    // Generate daily data points
    const dataPoints = [];
    let cumulativeProfitLoss = 0;
    
    // Create a map of dates to profit/loss
    const dateMap = {};
    
    // Initialize all dates in the range
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      dateMap[dateString] = 0;
    }
    
    // Calculate profit/loss for each trade
    trades.forEach(trade => {
      const dateString = new Date(trade.createdAt).toISOString().split('T')[0];
      
      if (trade.type === 'buy') {
        dateMap[dateString] -= trade.total;
      } else {
        dateMap[dateString] += trade.total;
      }
    });
    
    // Convert to array of data points with cumulative profit/loss
    Object.entries(dateMap).forEach(([date, profitLoss]) => {
      cumulativeProfitLoss += profitLoss;
      dataPoints.push({
        date,
        profitLoss,
        cumulativeProfitLoss
      });
    });
    
    res.status(200).json({
      success: true,
      data: dataPoints
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get portfolio history
// @route   GET /api/analytics/portfolio-history
// @access  Private
exports.getPortfolioHistory = async (req, res, next) => {
  try {
    // Get time range from query params (default to 30 days)
    const days = parseInt(req.query.days, 10) || 30;
    
    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    // Get user's portfolio history
    const user = await User.findById(req.user.id);
    
    // If user has no portfolio history, return empty array
    if (!user.portfolio.history || user.portfolio.history.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    // Filter history to only include entries within the time range
    const filteredHistory = user.portfolio.history.filter(entry => 
      new Date(entry.date) >= startDate
    );
    
    // Sort by date
    filteredHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.status(200).json({
      success: true,
      data: filteredHistory
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get performance for a specific coin
// @route   GET /api/analytics/coin/:coinId
// @access  Private
exports.getCoinPerformance = async (req, res, next) => {
  try {
    const { coinId } = req.params;
    
    // Get all completed trades for the user for this coin
    const trades = await Trade.find({
      user: req.user.id,
      coinId,
      status: 'completed'
    }).sort({ createdAt: 1 });
    
    if (trades.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No trades found for this coin'
      });
    }
    
    // Calculate metrics
    const totalTrades = trades.length;
    const buyTrades = trades.filter(trade => trade.type === 'buy');
    const sellTrades = trades.filter(trade => trade.type === 'sell');
    
    // Calculate total bought and sold
    let totalBought = 0;
    let totalBoughtValue = 0;
    let totalSold = 0;
    let totalSoldValue = 0;
    
    buyTrades.forEach(trade => {
      totalBought += trade.quantity;
      totalBoughtValue += trade.total;
    });
    
    sellTrades.forEach(trade => {
      totalSold += trade.quantity;
      totalSoldValue += trade.total;
    });
    
    // Calculate average buy and sell prices
    const avgBuyPrice = totalBought > 0 ? totalBoughtValue / totalBought : 0;
    const avgSellPrice = totalSold > 0 ? totalSoldValue / totalSold : 0;
    
    // Calculate profit/loss
    const profitLoss = totalSoldValue - (totalSold / totalBought) * totalBoughtValue;
    const profitLossPercentage = avgBuyPrice > 0 ? ((avgSellPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;
    
    // Calculate current holdings
    const currentHolding = totalBought - totalSold;
    
    // Get current price from user's holdings
    const user = await User.findById(req.user.id);
    const holding = user.portfolio.holdings.find(h => h.coinId === coinId);
    const currentPrice = holding ? holding.currentPrice : 0;
    
    // Calculate unrealized profit/loss
    const unrealizedProfitLoss = currentHolding * (currentPrice - avgBuyPrice);
    const unrealizedProfitLossPercentage = avgBuyPrice > 0 ? ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;
    
    res.status(200).json({
      success: true,
      data: {
        coinId,
        coinSymbol: trades[0].coinSymbol,
        totalTrades,
        buyTrades: buyTrades.length,
        sellTrades: sellTrades.length,
        totalBought,
        totalBoughtValue,
        totalSold,
        totalSoldValue,
        avgBuyPrice,
        avgSellPrice,
        currentHolding,
        currentPrice,
        profitLoss,
        profitLossPercentage,
        unrealizedProfitLoss,
        unrealizedProfitLossPercentage,
        trades
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get comparison with friends
// @route   GET /api/analytics/comparison
// @access  Private
exports.getComparisonWithFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.friends || user.friends.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          user: {
            _id: user._id,
            name: user.name,
            portfolioValue: user.portfolio.totalValue || user.portfolio.balance,
            profitLossPercentage: 0
          },
          friends: []
        }
      });
    }
    
    // Get friends' data
    const friends = await User.find({ _id: { $in: user.friends } })
      .select('name avatar portfolio.totalValue portfolio.balance');
    
    // Calculate user's profit/loss percentage
    const userTrades = await Trade.find({
      user: req.user.id,
      status: 'completed'
    });
    
    let userTotalInvested = 0;
    let userTotalReturned = 0;
    
    userTrades.forEach(trade => {
      if (trade.type === 'buy') {
        userTotalInvested += trade.total;
      } else {
        userTotalReturned += trade.total;
      }
    });
    
    const userProfitLoss = userTotalReturned - userTotalInvested;
    const userProfitLossPercentage = userTotalInvested > 0 ? (userProfitLoss / userTotalInvested) * 100 : 0;
    
    // Get friends' profit/loss percentages
    const friendsData = await Promise.all(
      friends.map(async friend => {
        const friendTrades = await Trade.find({
          user: friend._id,
          status: 'completed'
        });
        
        let friendTotalInvested = 0;
        let friendTotalReturned = 0;
        
        friendTrades.forEach(trade => {
          if (trade.type === 'buy') {
            friendTotalInvested += trade.total;
          } else {
            friendTotalReturned += trade.total;
          }
        });
        
        const friendProfitLoss = friendTotalReturned - friendTotalInvested;
        const friendProfitLossPercentage = friendTotalInvested > 0 ? (friendProfitLoss / friendTotalInvested) * 100 : 0;
        
        return {
          _id: friend._id,
          name: friend.name,
          avatar: friend.avatar,
          portfolioValue: friend.portfolio.totalValue || friend.portfolio.balance,
          profitLossPercentage: friendProfitLossPercentage
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          portfolioValue: user.portfolio.totalValue || user.portfolio.balance,
          profitLossPercentage: userProfitLossPercentage
        },
        friends: friendsData
      }
    });
  } catch (err) {
    next(err);
  }
};

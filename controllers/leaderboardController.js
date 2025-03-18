const User = require('../models/User');
const Trade = require('../models/Trade');
const mongoose = require('mongoose');

// @desc    Get global leaderboard
// @route   GET /api/leaderboard/global
// @access  Private
exports.getGlobalLeaderboard = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('name avatar portfolio.totalValue portfolio.balance portfolio.holdings')
      .sort({ 'portfolio.totalValue': -1 })
      .limit(50);
    
    // Calculate total portfolio value for each user
    const leaderboard = users.map(user => {
      // If totalValue is already calculated, use it
      if (user.portfolio.totalValue) {
        return {
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
          portfolioValue: user.portfolio.totalValue
        };
      }
      
      // Otherwise calculate from balance and holdings
      let totalValue = user.portfolio.balance;
      
      // Add value of holdings (this is simplified - in reality you'd need current prices)
      if (user.portfolio.holdings && user.portfolio.holdings.length > 0) {
        const holdingsValue = user.portfolio.holdings.reduce((total, holding) => {
          // This assumes you store currentValue in holdings
          // If not, you'd need to fetch current prices
          return total + (holding.currentValue || 0);
        }, 0);
        
        totalValue += holdingsValue;
      }
      
      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        portfolioValue: totalValue
      };
    });
    
    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get friends leaderboard
// @route   GET /api/leaderboard/friends
// @access  Private
exports.getFriendsLeaderboard = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser.friends || currentUser.friends.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    // Include current user in the leaderboard
    const friendIds = [...currentUser.friends, req.user.id];
    
    const users = await User.find({ _id: { $in: friendIds } })
      .select('name avatar portfolio.totalValue portfolio.balance portfolio.holdings')
      .sort({ 'portfolio.totalValue': -1 });
    
    // Calculate total portfolio value for each user (same as global leaderboard)
    const leaderboard = users.map(user => {
      // If totalValue is already calculated, use it
      if (user.portfolio.totalValue) {
        return {
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
          portfolioValue: user.portfolio.totalValue,
          isCurrentUser: user._id.toString() === req.user.id
        };
      }
      
      // Otherwise calculate from balance and holdings
      let totalValue = user.portfolio.balance;
      
      // Add value of holdings
      if (user.portfolio.holdings && user.portfolio.holdings.length > 0) {
        const holdingsValue = user.portfolio.holdings.reduce((total, holding) => {
          return total + (holding.currentValue || 0);
        }, 0);
        
        totalValue += holdingsValue;
      }
      
      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        portfolioValue: totalValue,
        isCurrentUser: user._id.toString() === req.user.id
      };
    });
    
    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get daily gainers leaderboard
// @route   GET /api/leaderboard/daily
// @access  Private
exports.getDailyGainers = async (req, res, next) => {
  try {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    // Get today's date
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Get all completed trades in the last 24 hours
    const trades = await Trade.find({
      status: 'completed',
      createdAt: { $gte: yesterday, $lte: today }
    });
    
    // Calculate profit/loss by user
    const userProfits = {};
    
    trades.forEach(trade => {
      const userId = trade.user.toString();
      
      if (!userProfits[userId]) {
        userProfits[userId] = {
          userId,
          totalProfit: 0,
          tradeCount: 0
        };
      }
      
      // For buy trades, we don't calculate immediate profit
      if (trade.type === 'buy') {
        userProfits[userId].tradeCount++;
        return;
      }
      
      // For sell trades, calculate profit
      // This is simplified - in reality you'd need to know the buy price
      // Here we're assuming the profit is stored in the trade
      const profit = trade.profit || 0;
      userProfits[userId].totalProfit += profit;
      userProfits[userId].tradeCount++;
    });
    
    // Convert to array and sort by profit
    const profitArray = Object.values(userProfits)
      .filter(item => item.tradeCount > 0)
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 50);
    
    // Get user details
    const userIds = profitArray.map(item => item.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name avatar');
    
    // Create user map for quick lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = {
        name: user.name,
        avatar: user.avatar
      };
    });
    
    // Combine profit data with user details
    const leaderboard = profitArray.map(item => ({
      _id: item.userId,
      name: userMap[item.userId]?.name || 'Unknown User',
      avatar: userMap[item.userId]?.avatar || null,
      profit: item.totalProfit,
      tradeCount: item.tradeCount
    }));
    
    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get weekly gainers leaderboard
// @route   GET /api/leaderboard/weekly
// @access  Private
exports.getWeeklyGainers = async (req, res, next) => {
  try {
    // Get date from 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    // Get today's date
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Get all completed trades in the last week
    const trades = await Trade.find({
      status: 'completed',
      createdAt: { $gte: weekAgo, $lte: today }
    });
    
    // Calculate profit/loss by user (same logic as daily gainers)
    const userProfits = {};
    
    trades.forEach(trade => {
      const userId = trade.user.toString();
      
      if (!userProfits[userId]) {
        userProfits[userId] = {
          userId,
          totalProfit: 0,
          tradeCount: 0
        };
      }
      
      if (trade.type === 'buy') {
        userProfits[userId].tradeCount++;
        return;
      }
      
      const profit = trade.profit || 0;
      userProfits[userId].totalProfit += profit;
      userProfits[userId].tradeCount++;
    });
    
    // Convert to array and sort by profit
    const profitArray = Object.values(userProfits)
      .filter(item => item.tradeCount > 0)
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 50);
    
    // Get user details
    const userIds = profitArray.map(item => item.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name avatar');
    
    // Create user map for quick lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = {
        name: user.name,
        avatar: user.avatar
      };
    });
    
    // Combine profit data with user details
    const leaderboard = profitArray.map(item => ({
      _id: item.userId,
      name: userMap[item.userId]?.name || 'Unknown User',
      avatar: userMap[item.userId]?.avatar || null,
      profit: item.totalProfit,
      tradeCount: item.tradeCount
    }));
    
    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get monthly gainers leaderboard
// @route   GET /api/leaderboard/monthly
// @access  Private
exports.getMonthlyGainers = async (req, res, next) => {
  try {
    // Get date from 30 days ago
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);
    
    // Get today's date
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Get all completed trades in the last month
    const trades = await Trade.find({
      status: 'completed',
      createdAt: { $gte: monthAgo, $lte: today }
    });
    
    // Calculate profit/loss by user (same logic as daily/weekly gainers)
    const userProfits = {};
    
    trades.forEach(trade => {
      const userId = trade.user.toString();
      
      if (!userProfits[userId]) {
        userProfits[userId] = {
          userId,
          totalProfit: 0,
          tradeCount: 0
        };
      }
      
      if (trade.type === 'buy') {
        userProfits[userId].tradeCount++;
        return;
      }
      
      const profit = trade.profit || 0;
      userProfits[userId].totalProfit += profit;
      userProfits[userId].tradeCount++;
    });
    
    // Convert to array and sort by profit
    const profitArray = Object.values(userProfits)
      .filter(item => item.tradeCount > 0)
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 50);
    
    // Get user details
    const userIds = profitArray.map(item => item.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name avatar');
    
    // Create user map for quick lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = {
        name: user.name,
        avatar: user.avatar
      };
    });
    
    // Combine profit data with user details
    const leaderboard = profitArray.map(item => ({
      _id: item.userId,
      name: userMap[item.userId]?.name || 'Unknown User',
      avatar: userMap[item.userId]?.avatar || null,
      profit: item.totalProfit,
      tradeCount: item.tradeCount
    }));
    
    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (err) {
    next(err);
  }
};

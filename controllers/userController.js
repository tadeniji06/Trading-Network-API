const User = require('../models/User');

// @desc    Complete user onboarding
// @route   POST /api/user/onboarding
// @access  Private
exports.completeOnboarding = async (req, res, next) => {
  try {
    const { name, experience, interests, notifications, onboardingComplete } = req.body;

    // Find the user by ID (from auth middleware)
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user with onboarding information
    if (name) user.name = name;
    if (experience) user.experience = experience;
    if (interests) user.interests = interests;
    if (notifications !== undefined) user.notifications = notifications;
    if (onboardingComplete !== undefined) user.onboardingComplete = onboardingComplete;

    // Save the updated user
    await user.save();

    // Return the updated user
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        experience: user.experience,
        interests: user.interests,
        notifications: user.notifications,
        onboardingComplete: user.onboardingComplete
      }
    });
  } catch (err) {
    console.error('Onboarding error:', err);
    next(err);
  }
};

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        experience: user.experience,
        interests: user.interests,
        notifications: user.notifications,
        onboardingComplete: user.onboardingComplete
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user profile by ID
// @route   GET /api/user/profile/:userId
// @access  Private
exports.getUserProfileById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Return limited public information about the user
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
        badges: user.badges,
        stats: {
          followers: user.followers?.length || 0,
          following: user.following?.length || 0,
          totalTrades: user.stats?.totalTrades || 0,
          winRate: user.stats?.winRate || 0,
          avgProfit: user.stats?.avgProfit || 0,
          topCoins: user.stats?.topCoins || []
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get social status between current user and target user
// @route   GET /api/user/:userId/social-status
// @access  Private
exports.getSocialStatus = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const targetUserId = req.params.userId;
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: 'Current user not found'
      });
    }
    
    // Check if users are friends
    const isFriend = currentUser.friends && 
      currentUser.friends.some(friendId => friendId.toString() === targetUserId);
    
    // Check if current user is following target user
    const isFollowing = currentUser.following && 
      currentUser.following.some(followId => followId.toString() === targetUserId);
    
    // Check if current user has sent a friend request to target user
    const friendRequestSent = currentUser.friendRequestsSent && 
      currentUser.friendRequestsSent.some(requestId => requestId.toString() === targetUserId);
    
    // Check if current user has received a friend request from target user
    const friendRequestReceived = currentUser.friendRequestsReceived && 
      currentUser.friendRequestsReceived.some(requestId => requestId.toString() === targetUserId);
    
    res.status(200).json({
      success: true,
      data: {
        isFriend,
        isFollowing,
        friendRequestSent,
        friendRequestReceived
      }
    });
    
  } catch (err) {
    console.error('Error getting social status:', err);
    next(err);
  }
};

// @desc    Get user's trades
// @route   GET /api/user/:userId/trades
// @access  Private
exports.getUserTrades = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.id;
    
    // Find the target user
    const targetUser = await User.findById(targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Import the Trade model - make sure the path is correct for your project structure
    const Trade = require('../models/Trade');
    
    // Query conditions
    const queryConditions = { user: targetUserId };
    
    // If the current user is not viewing their own profile and they're not friends,
    // only show public trades (if you have a public/private flag on trades)
    if (targetUserId !== currentUserId && 
        !(targetUser.friends && targetUser.friends.includes(currentUserId))) {
      queryConditions.isPublic = true; // Assuming you have an isPublic field
    }
    
    // Get trades
    const trades = await Trade.find(queryConditions)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(20); // Limit to 20 trades
    
    res.status(200).json({
      success: true,
      data: trades
    });
    
  } catch (err) {
    console.error('Error getting user trades:', err);
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
exports.updateUserProfile = async (req, res, next) => {
  try {
    const { name, email, avatar, experience, interests, notifications } = req.body;

    // Find the user by ID
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;
    if (experience) user.experience = experience;
    if (interests) user.interests = interests;
    if (notifications !== undefined) user.notifications = notifications;

    // Save the updated user
    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        experience: user.experience,
        interests: user.interests,
        notifications: user.notifications,
        onboardingComplete: user.onboardingComplete
      }
    });
  } catch (err) {
    next(err);
  }
};

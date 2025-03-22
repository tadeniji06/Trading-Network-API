const User = require('../models/User');
const Trade = require('../models/Trade');
// @desc    Send friend request to a user
// @route   POST /api/social/friends/request/:userId
// @access  Private
exports.sendFriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if it's the same user
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot send a friend request to yourself'
      });
    }
    
    // Check if friend request already sent
    const currentUser = await User.findById(req.user.id);
    
    if (currentUser.friendRequests && currentUser.friendRequests.sent.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Friend request already sent'
      });
    }
    
    // Check if they are already friends
    if (currentUser.friends && currentUser.friends.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'You are already friends with this user'
      });
    }
    
    // Add to sent friend requests for current user
    if (!currentUser.friendRequests) {
      currentUser.friendRequests = { sent: [], received: [] };
    }
    
    if (!currentUser.friendRequests.sent.includes(userId)) {
      currentUser.friendRequests.sent.push(userId);
    }
    
    await currentUser.save();
    
    // Add to received friend requests for target user
    if (!user.friendRequests) {
      user.friendRequests = { sent: [], received: [] };
    }
    
    if (!user.friendRequests.received.includes(req.user.id)) {
      user.friendRequests.received.push(req.user.id);
    }
    
    await user.save();
    
    // Create notification for target user
    // This would be implemented when we add the notification system
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Accept friend request
// @route   POST /api/social/friends/accept/:userId
// @access  Private
exports.acceptFriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if friend request exists
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser.friendRequests || !currentUser.friendRequests.received.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'No friend request from this user'
      });
    }
    
    // Add to friends list for both users
    if (!currentUser.friends) {
      currentUser.friends = [];
    }
    
    if (!user.friends) {
      user.friends = [];
    }
    
    currentUser.friends.push(userId);
    user.friends.push(req.user.id);
    
    // Remove from friend requests
    currentUser.friendRequests.received = currentUser.friendRequests.received.filter(
      id => id.toString() !== userId
    );
    
    user.friendRequests.sent = user.friendRequests.sent.filter(
      id => id.toString() !== req.user.id
    );
    
    await Promise.all([currentUser.save(), user.save()]);
    
    // Create notification for the other user
    // This would be implemented when we add the notification system
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject friend request
// @route   POST /api/social/friends/reject/:userId
// @access  Private
exports.rejectFriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if friend request exists
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser.friendRequests || !currentUser.friendRequests.received.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'No friend request from this user'
      });
    }
    
    // Remove from friend requests
    currentUser.friendRequests.received = currentUser.friendRequests.received.filter(
      id => id.toString() !== userId
    );
    
    user.friendRequests.sent = user.friendRequests.sent.filter(
      id => id.toString() !== req.user.id
    );
    
    await Promise.all([currentUser.save(), user.save()]);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove friend
// @route   DELETE /api/social/friends/:userId
// @access  Private
exports.removeFriend = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if they are friends
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser.friends || !currentUser.friends.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'You are not friends with this user'
      });
    }
    
    // Remove from friends list for both users
    currentUser.friends = currentUser.friends.filter(
      id => id.toString() !== userId
    );
    
    user.friends = user.friends.filter(
      id => id.toString() !== req.user.id
    );
    
    await Promise.all([currentUser.save(), user.save()]);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Follow a user
// @route   POST /api/social/follow/:userId
// @access  Private
exports.followUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if it's the same user
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot follow yourself'
      });
    }
    
    // Check if already following
    const currentUser = await User.findById(req.user.id);
    
    if (currentUser.following && currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'You are already following this user'
      });
    }
    
    // Add to following list for current user
    if (!currentUser.following) {
      currentUser.following = [];
    }
    
    currentUser.following.push(userId);
    
    // Add to followers list for target user
    if (!user.followers) {
      user.followers = [];
    }
    
    user.followers.push(req.user.id);
    
    await Promise.all([currentUser.save(), user.save()]);
    
    // Create notification for target user
    // This would be implemented when we add the notification system
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Unfollow a user
// @route   DELETE /api/social/follow/:userId
// @access  Private
exports.unfollowUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if following
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser.following || !currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'You are not following this user'
      });
    }
    
    // Remove from following list for current user
    currentUser.following = currentUser.following.filter(
      id => id.toString() !== userId
    );
    
    // Remove from followers list for target user
    user.followers = user.followers.filter(
      id => id.toString() !== req.user.id
    );
    
    await Promise.all([currentUser.save(), user.save()]);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's followers
// @route   GET /api/social/followers
// @access  Private
exports.getFollowers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('followers', 'name avatar');
    
    res.status(200).json({
      success: true,
      count: user.followers ? user.followers.length : 0,
      data: user.followers || []
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get users that the current user is following
// @route   GET /api/social/following
// @access  Private
exports.getFollowing = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('following', 'name avatar');
    
    res.status(200).json({
      success: true,
      count: user.following ? user.following.length : 0,
      data: user.following || []
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's friends
// @route   GET /api/social/friends
// @access  Private
exports.getFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'name avatar');
    
    res.status(200).json({
      success: true,
      count: user.friends ? user.friends.length : 0,
      data: user.friends || []
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's friend requests
// @route   GET /api/social/friends/requests
// @access  Private
exports.getFriendRequests = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get received requests with user details
    const receivedRequests = await User.find({
      _id: { $in: user.friendRequests ? user.friendRequests.received : [] }
    }).select('name avatar');
    
    // Get sent requests with user details
    const sentRequests = await User.find({
      _id: { $in: user.friendRequests ? user.friendRequests.sent : [] }
    }).select('name avatar');
    
    res.status(200).json({
      success: true,
      data: {
        received: receivedRequests,
        sent: sentRequests
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get activity feed
// @route   GET /api/social/feed
// @access  Private
exports.getActivityFeed = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get IDs of users to include in feed (friends and following)
    const feedUserIds = [
      ...new Set([
        ...(user.friends || []),
        ...(user.following || [])
      ])
    ];
    
    // Add current user to feed
    feedUserIds.push(req.user.id);
    
    // Get recent trades from these users
    const trades = await Trade.find({
      user: { $in: feedUserIds },
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('user', 'name avatar');
    
    // Get recent posts from these users
    // This would be implemented when we add the posts system
    
    res.status(200).json({
      success: true,
      data: {
        trades
        // posts would be added here when implemented
      }
    });
  } catch (err) {
    next(err);
  }
};

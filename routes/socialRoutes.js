const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Import controllers (you'll need to create these)
const {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFriends,
  getFriendRequests,
  getActivityFeed
} = require('../controllers/socialController');

// Protect all routes
router.use(protect);

// Friend routes
router.post('/friends/request/:userId', sendFriendRequest);
router.post('/friends/accept/:userId', acceptFriendRequest);
router.post('/friends/reject/:userId', rejectFriendRequest);
router.delete('/friends/:userId', removeFriend);
router.get('/friends', getFriends);
router.get('/friends/requests', getFriendRequests);

// Follow routes
router.post('/follow/:userId', followUser);
router.delete('/follow/:userId', unfollowUser);
router.get('/followers', getFollowers);
router.get('/following', getFollowing);

// Activity feed
router.get('/feed', getActivityFeed);

module.exports = router;

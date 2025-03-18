const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Import controllers
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
} = require('../controllers/notificationController');

// Protect all routes
router.use(protect);

// Notification routes
router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);
router.get('/unread-count', getUnreadCount);

module.exports = router;

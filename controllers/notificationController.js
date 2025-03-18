const Notification = require('../models/Notifications');

// @desc    Get all notifications for the current user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    
    const total = await Notification.countDocuments({ user: req.user.id });
    
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('relatedTo.id', 'name avatar coinSymbol type quantity price');
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: notifications
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    // Check if notification belongs to user
    if (notification.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this notification'
      });
    }
    
    notification.read = true;
    await notification.save();
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true }
    );
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    // Check if notification belongs to user
    if (notification.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this notification'
      });
    }
    
    await notification.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get count of unread notifications
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      read: false
    });
    
    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to create a notification (for use in other controllers)
exports.createNotification = async (userId, type, message, relatedTo = null) => {
  try {
    await Notification.create({
      user: userId,
      type,
      message,
      relatedTo
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

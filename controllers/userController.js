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

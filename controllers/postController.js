const Post = require('../models/Post');
const Trade = require('../models/Trade');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// @desc    Create a post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res, next) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Please provide content for the post'
      });
    }
    
    const post = await Post.create({
      user: req.user.id,
      content
    });
    
    res.status(201).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all posts (with pagination)
// @route   GET /api/posts
// @access  Private
exports.getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Get posts from users the current user follows and their own posts
    const user = await User.findById(req.user.id);
    const following = user.following || [];
    const userIds = [...following, req.user.id];
    
    const total = await Post.countDocuments({ user: { $in: userIds } });
    
    const posts = await Post.find({ user: { $in: userIds } })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('user', 'name avatar')
      .populate('trade', 'coinSymbol type quantity price total')
      .populate('comments.user', 'name avatar');
    
    res.status(200).json({
      success: true,
      count: posts.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: posts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get a single post
// @route   GET /api/posts/:id
// @access  Private
exports.getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name avatar')
      .populate('trade', 'coinSymbol type quantity price total')
      .populate('comments.user', 'name avatar');
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = async (req, res, next) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Please provide content for the post'
      });
    }
    
    let post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // Check if post belongs to user
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this post'
      });
    }
    
    post.content = content;
    await post.save();
    
    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // Check if post belongs to user
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this post'
      });
    }
    
    await post.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Like a post
// @route   POST /api/posts/:id/like
// @access  Private
exports.likePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // Check if post has already been liked by user
    if (post.likes.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        error: 'Post already liked'
      });
    }
    
    post.likes.push(req.user.id);
    await post.save();
    
    // Create notification for post owner (if not the current user)
    if (post.user.toString() !== req.user.id) {
      const user = await User.findById(req.user.id);
      
      await createNotification(
        post.user,
        'like',
        `${user.name} liked your post`,
        {
          model: 'Post',
          id: post._id
        }
      );
    }
    
    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Unlike a post
// @route   DELETE /api/posts/:id/like
// @access  Private
exports.unlikePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // Check if post has been liked by user
    if (!post.likes.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        error: 'Post has not been liked'
      });
    }
    
    // Remove like
    post.likes = post.likes.filter(
      like => like.toString() !== req.user.id
    );
    
    await post.save();
    
    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a comment to a post
// @route   POST /api/posts/:id/comments
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Please provide content for the comment'
      });
    }
    
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // Add comment
    post.comments.unshift({
      user: req.user.id,
      content
    });
    
    await post.save();
    
    // Create notification for post owner (if not the current user)
    if (post.user.toString() !== req.user.id) {
      const user = await User.findById(req.user.id);
      
      await createNotification(
        post.user,
        'comment',
        `${user.name} commented on your post`,
        {
          model: 'Post',
          id: post._id
        }
      );
    }
    
    res.status(200).json({
      success: true,
      data: post.comments[0]
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a comment
// @route   DELETE /api/posts/:id/comments/:commentId
// @access  Private
exports.deleteComment = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // Find comment
    const comment = post.comments.find(
      comment => comment._id.toString() === req.params.commentId
    );
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }
    
    // Check if comment belongs to user or if user is post owner
    if (comment.user.toString() !== req.user.id && post.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this comment'
      });
    }
    
    // Remove comment
    post.comments = post.comments.filter(
      comment => comment._id.toString() !== req.params.commentId
    );
    
    await post.save();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get posts by user
// @route   GET /api/posts/user/:userId
// @access  Private
exports.getPostsByUser = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const total = await Post.countDocuments({ user: req.params.userId });
    
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('user', 'name avatar')
      .populate('trade', 'coinSymbol type quantity price total')
      .populate('comments.user', 'name avatar');
    
    res.status(200).json({
      success: true,
      count: posts.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: posts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Share a trade as a post
// @route   POST /api/posts/share-trade/:tradeId
// @access  Private
exports.shareTrade = async (req, res, next) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Please provide content for the post'
      });
    }
    
    // Check if trade exists and belongs to user
    const trade = await Trade.findById(req.params.tradeId);
    
    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }
    
    if (trade.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to share this trade'
      });
    }
    
    // Create post with trade reference
    const post = await Post.create({
      user: req.user.id,
      content,
      trade: trade._id
    });
    
    res.status(201).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Import controllers
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  addComment,
  deleteComment,
  getPostsByUser,
  shareTrade
} = require('../controllers/postController');

// Protect all routes
router.use(protect);

// Post routes
router.post('/', createPost);
router.get('/', getPosts);
router.get('/:id', getPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);

// Like routes
router.post('/:id/like', likePost);
router.delete('/:id/like', unlikePost);

// Comment routes
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', deleteComment);

// User posts
router.get('/user/:userId', getPostsByUser);

// Share trade
router.post('/share-trade/:tradeId', shareTrade);

module.exports = router;

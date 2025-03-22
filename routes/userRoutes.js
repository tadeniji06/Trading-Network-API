const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  completeOnboarding,
  getUserProfile,
  updateUserProfile,
  getUserProfileById,
  getSocialStatus,
  getUserTrades,
} = require("../controllers/userController");

// User routes
router.post("/onboarding", protect, completeOnboarding);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.get("/profile/:userId", protect, getUserProfileById);
// Add these routes
router.get("/:userId/social-status", protect, getSocialStatus);
router.get("/:userId/trades", protect, getUserTrades);

module.exports = router;

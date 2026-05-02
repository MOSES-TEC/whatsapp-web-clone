const express = require("express");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users except current user
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      "-password -socketId"
    );
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: "Server error fetching users" });
  }
});

// @route   GET /api/users/:id
// @desc    Get a specific user
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -socketId"
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", protect, async (req, res) => {
  try {
    const { username, status, avatar } = req.body;
    const updates = {};

    if (username) {
      const exists = await User.findOne({
        username,
        _id: { $ne: req.user._id },
      });
      if (exists) {
        return res.status(400).json({ error: "Username already taken" });
      }
      updates.username = username;
    }
    if (status !== undefined) updates.status = status;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password -socketId");

    res.json({ success: true, user });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages[0] });
    }
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

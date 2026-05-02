const express = require("express");
const Message = require("../models/Message");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/messages/:userId
// @desc    Get messages between current user and another user
// @access  Private
router.get("/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Validate other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const roomId = Message.getRoomId(req.user._id, userId);

    const messages = await Message.find({ roomId })
      .populate("sender", "username avatar")
      .populate("receiver", "username avatar")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
      { roomId, receiver: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: { page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    res.status(500).json({ error: "Server error fetching messages" });
  }
});

// @route   POST /api/messages
// @desc    Send a message (REST fallback; real-time uses Socket.io)
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res
        .status(400)
        .json({ error: "Receiver ID and content are required" });
    }

    if (!content.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    if (receiverId === req.user._id.toString()) {
      return res
        .status(400)
        .json({ error: "Cannot send message to yourself" });
    }

    const roomId = Message.getRoomId(req.user._id, receiverId);

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      content: content.trim(),
      roomId,
    });

    await message.populate("sender", "username avatar");
    await message.populate("receiver", "username avatar");

    // Emit via Socket.io if available
    if (req.io) {
      req.io.to(roomId).emit("newMessage", message);
    }

    res.status(201).json({ success: true, message });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages[0] });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid receiver ID" });
    }
    res.status(500).json({ error: "Server error sending message" });
  }
});

// @route   GET /api/messages/unread/count
// @desc    Get unread message counts per conversation
// @access  Private
router.get("/unread/count", protect, async (req, res) => {
  try {
    const unreadCounts = await Message.aggregate([
      { $match: { receiver: req.user._id, isRead: false } },
      { $group: { _id: "$sender", count: { $sum: 1 } } },
    ]);

    const counts = {};
    unreadCounts.forEach((item) => {
      counts[item._id.toString()] = item.count;
    });

    res.json({ success: true, unreadCounts: counts });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

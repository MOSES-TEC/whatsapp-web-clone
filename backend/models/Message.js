const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [4096, "Message cannot exceed 4096 characters"],
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Room ID is a sorted concatenation of both user IDs for easy querying
    roomId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for faster message retrieval by room
messageSchema.index({ roomId: 1, createdAt: 1 });
messageSchema.index({ sender: 1, receiver: 1 });

// Static method to generate consistent room ID
messageSchema.statics.getRoomId = function (userId1, userId2) {
  return [userId1.toString(), userId2.toString()].sort().join("_");
};

module.exports = mongoose.model("Message", messageSchema);

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");

const onlineUsers = new Map(); // userId -> socketId

const initSocket = (io) => {
  // Middleware: authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: No token"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback_secret"
      );
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🟢 User connected: ${socket.user.username} (${socket.id})`);

    // Track online user
    onlineUsers.set(userId, socket.id);

    // Update user online status in DB
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: new Date(),
    });

    // Broadcast online status to all clients
    io.emit("userOnline", { userId, username: socket.user.username });

    // Send current online users list to the newly connected user
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));

    // --- Event: Join a private chat room ---
    socket.on("joinRoom", ({ receiverId }) => {
      const roomId = [userId, receiverId].sort().join("_");
      socket.join(roomId);
      console.log(`📩 ${socket.user.username} joined room: ${roomId}`);
    });

    // --- Event: Leave a chat room ---
    socket.on("leaveRoom", ({ receiverId }) => {
      const roomId = [userId, receiverId].sort().join("_");
      socket.leave(roomId);
    });

    // --- Event: Send a message ---
    socket.on("sendMessage", async ({ receiverId, content }, callback) => {
      try {
        if (!content || !content.trim()) {
          if (callback) callback({ error: "Message cannot be empty" });
          return;
        }

        if (!receiverId) {
          if (callback) callback({ error: "Receiver is required" });
          return;
        }

        if (receiverId === userId) {
          if (callback) callback({ error: "Cannot message yourself" });
          return;
        }

        const roomId = Message.getRoomId(userId, receiverId);

        const message = await Message.create({
          sender: userId,
          receiver: receiverId,
          content: content.trim(),
          roomId,
        });

        await message.populate("sender", "username avatar");
        await message.populate("receiver", "username avatar");

        // Emit to everyone in the room (sender + receiver if in room)
        io.to(roomId).emit("newMessage", message);

        // If receiver is online but not in the room, send a notification
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          const receiverSocket = io.sockets.sockets.get(receiverSocketId);
          if (receiverSocket && !receiverSocket.rooms.has(roomId)) {
            io.to(receiverSocketId).emit("messageNotification", {
              message,
              sender: { _id: userId, username: socket.user.username },
            });
          }
        }

        if (callback) callback({ success: true, message });
      } catch (error) {
        console.error("Send message error:", error);
        if (callback) callback({ error: "Failed to send message" });
      }
    });

    // --- Event: Typing indicator ---
    socket.on("typing", ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userTyping", {
          userId,
          username: socket.user.username,
        });
      }
    });

    // --- Event: Stop typing ---
    socket.on("stopTyping", ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userStopTyping", { userId });
      }
    });

    // --- Event: Mark messages as read ---
    socket.on("markRead", async ({ senderId }) => {
      try {
        const roomId = Message.getRoomId(userId, senderId);
        await Message.updateMany(
          { roomId, receiver: userId, isRead: false },
          { isRead: true, readAt: new Date() }
        );
        // Notify sender their messages were read
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messagesRead", { byUserId: userId });
        }
      } catch (error) {
        console.error("Mark read error:", error);
      }
    });

    // --- Event: Disconnect ---
    socket.on("disconnect", async () => {
      console.log(`🔴 User disconnected: ${socket.user.username}`);
      onlineUsers.delete(userId);

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        socketId: null,
        lastSeen: new Date(),
      });

      io.emit("userOffline", { userId, lastSeen: new Date() });
    });
  });
};

module.exports = { initSocket, onlineUsers };

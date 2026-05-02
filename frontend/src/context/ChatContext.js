import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { usersAPI, messagesAPI } from "../utils/api";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user, socket } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const selectedUserRef = useRef(null);

  // Keep ref in sync for socket callbacks
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await usersAPI.getAll();
      setUsers(data.users);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, []);

  // Fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const { data } = await messagesAPI.getUnreadCounts();
      setUnreadCounts(data.unreadCounts);
    } catch (err) {
      console.error("Error fetching unread counts:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchUnreadCounts();
    }
  }, [user, fetchUsers, fetchUnreadCounts]);

  // Load messages for selected user
  const loadMessages = useCallback(async (targetUserId) => {
    setLoadingMessages(true);
    try {
      const { data } = await messagesAPI.getMessages(targetUserId);
      setMessages(data.messages);
    } catch (err) {
      console.error("Error loading messages:", err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Select a user to chat with
  const selectUser = useCallback(
    (targetUser) => {
      if (!targetUser) {
        setSelectedUser(null);
        setMessages([]);
        return;
      }

      // Leave old room
      if (selectedUserRef.current && socket) {
        socket.emit("leaveRoom", { receiverId: selectedUserRef.current._id });
      }

      setSelectedUser(targetUser);
      loadMessages(targetUser._id);

      // Clear unread count for this user
      setUnreadCounts((prev) => ({ ...prev, [targetUser._id]: 0 }));

      // Join new room
      if (socket) {
        socket.emit("joinRoom", { receiverId: targetUser._id });
        socket.emit("markRead", { senderId: targetUser._id });
      }
    },
    [socket, loadMessages]
  );

  // Send a message via socket
  const sendMessage = useCallback(
    (content) => {
      if (!socket || !selectedUser || !content.trim()) return;

      return new Promise((resolve, reject) => {
        socket.emit(
          "sendMessage",
          { receiverId: selectedUser._id, content: content.trim() },
          (response) => {
            if (response?.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          }
        );
      });
    },
    [socket, selectedUser]
  );

  // Typing indicators
  const emitTyping = useCallback(() => {
    if (socket && selectedUser) {
      socket.emit("typing", { receiverId: selectedUser._id });
    }
  }, [socket, selectedUser]);

  const emitStopTyping = useCallback(() => {
    if (socket && selectedUser) {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
    }
  }, [socket, selectedUser]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      const currentSelected = selectedUserRef.current;
      const senderId = message.sender._id || message.sender;
      const receiverId = message.receiver._id || message.receiver;

      // Check if message is for the current active conversation
      const isCurrentConversation =
        currentSelected &&
        (senderId === currentSelected._id || receiverId === currentSelected._id);

      if (isCurrentConversation) {
        setMessages((prev) => {
          // Avoid duplicates
          const exists = prev.find((m) => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });

        // Mark as read if we're viewing this conversation
        if (socket && senderId !== user?._id) {
          socket.emit("markRead", { senderId });
        }
      } else {
        // Increment unread count
        if (senderId !== user?._id) {
          setUnreadCounts((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
        }
      }
    };

    const handleOnlineUsers = (userIds) => {
      setOnlineUsers(userIds);
    };

    const handleUserOnline = ({ userId }) => {
      setOnlineUsers((prev) =>
        prev.includes(userId) ? prev : [...prev, userId]
      );
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isOnline: true } : u))
      );
    };

    const handleUserOffline = ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isOnline: false, lastSeen } : u
        )
      );
    };

    const handleTyping = ({ userId }) => {
      setTypingUsers((prev) => ({ ...prev, [userId]: true }));
    };

    const handleStopTyping = ({ userId }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    const handleMessageNotification = ({ message }) => {
      const senderId = message.sender._id || message.sender;
      if (senderId !== user?._id) {
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);
    socket.on("userTyping", handleTyping);
    socket.on("userStopTyping", handleStopTyping);
    socket.on("messageNotification", handleMessageNotification);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
      socket.off("userTyping", handleTyping);
      socket.off("userStopTyping", handleStopTyping);
      socket.off("messageNotification", handleMessageNotification);
    };
  }, [socket, user]);

  const isUserOnline = useCallback(
    (userId) => onlineUsers.includes(userId),
    [onlineUsers]
  );

  return (
    <ChatContext.Provider
      value={{
        users,
        selectedUser,
        messages,
        loadingMessages,
        unreadCounts,
        typingUsers,
        onlineUsers,
        selectUser,
        sendMessage,
        emitTyping,
        emitStopTyping,
        isUserOnline,
        fetchUsers,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};

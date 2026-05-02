import React, { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { Avatar } from "./Sidebar";

const formatMessageTime = (dateStr) => {
  if (!dateStr) return "";
  return format(new Date(dateStr), "HH:mm");
};

const formatMessageDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return format(date, "MMMM d, yyyy");
};

const shouldShowDateSeparator = (messages, index) => {
  if (index === 0) return true;
  const current = new Date(messages[index].createdAt);
  const previous = new Date(messages[index - 1].createdAt);
  return current.toDateString() !== previous.toDateString();
};

const TypingIndicator = () => (
  <div className="message incoming typing-message">
    <div className="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
);

const ChatWindow = () => {
  const { user } = useAuth();
  const {
    selectedUser,
    messages,
    loadingMessages,
    sendMessage,
    emitTyping,
    emitStopTyping,
    isUserOnline,
    typingUsers,
  } = useChat();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const isOnline = selectedUser ? isUserOnline(selectedUser._id) : false;
  const isTyping = selectedUser ? !!typingUsers[selectedUser._id] : false;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input on user select
  useEffect(() => {
    if (selectedUser) inputRef.current?.focus();
  }, [selectedUser]);

  const handleTyping = useCallback(
    (e) => {
      setInput(e.target.value);
      emitTyping();
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping();
      }, 2000);
    },
    [emitTyping, emitStopTyping]
  );

  const handleSend = async (e) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setInput("");
    setError("");
    setSending(true);
    emitStopTyping();
    clearTimeout(typingTimeoutRef.current);

    try {
      await sendMessage(trimmed);
    } catch (err) {
      setError(err.message || "Failed to send message");
      setInput(trimmed); // restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!selectedUser) {
    return (
      <div className="chat-welcome">
        <div className="chat-welcome-inner">
          <div className="chat-welcome-icon">
            <svg viewBox="0 0 303 172" fill="none" xmlns="http://www.w3.org/2000/svg" width="220">
              <path d="M229.565 160.229c32.647-10.984 56.766-41.988 56.766-78.4C286.331 36.6 249.728 0 204.503 0 159.277 0 122.674 36.6 122.674 81.83c0 18.95 6.386 36.383 17.038 50.279l-8.927 28.121 30.247-7.979c10.45 5.702 22.398 8.937 35.102 8.937 2.562 0 5.095-.141 7.59-.41" fill="#BFC2CB"/>
              <path d="M166.294 87.754c-1.44.914-3.27 1.384-5.25 1.384-4.37 0-8.31-2.23-10.523-5.914l-32.22-54.7a12.46 12.46 0 0 1-1.384-5.25c0-4.37 2.23-8.31 5.914-10.524l.005-.002c1.43-.91 3.26-1.38 5.248-1.38 4.371 0 8.312 2.23 10.524 5.914l32.22 54.7a12.457 12.457 0 0 1 1.384 5.25c0 4.371-2.23 8.312-5.918 10.522z" fill="#fff"/>
              <path d="M50.613 152.506c-2.61 1.66-5.61 2.42-8.601 2.42-5.19 0-10.28-2.44-13.53-6.93l-24.49-34.04c-3.25-4.52-3.97-10.1-1.97-15.28l.64-1.66 28.98-74.97c1.89-4.9 6.16-8.42 11.36-9.37.93-.17 1.87-.25 2.79-.25 4.35 0 8.49 1.77 11.52 4.93 3.04 3.17 4.59 7.44 4.33 11.81l-4.31 72.3 1.29 1.79 22.22 30.88c2.81 3.9 3.67 8.84 2.32 13.47-1.35 4.63-4.66 8.37-9.1 10.22l-23.44 4.67z" fill="#fff"/>
            </svg>
          </div>
          <h2>WhatsApp Web</h2>
          <p>
            Send and receive messages without keeping your phone online.
            <br />
            Use WhatsApp on up to 4 linked devices and 1 phone.
          </p>
          <div className="chat-welcome-hint">
            <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7V7h2v5zm0-6H7V4h2v2z"/>
            </svg>
            Select a contact on the left to start chatting
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Chat Header */}
      <div className="chat-header">
        <Avatar user={selectedUser} size={40} showOnline isOnline={isOnline} />
        <div className="chat-header-info">
          <h3 className="chat-header-name">{selectedUser.username}</h3>
          <p className="chat-header-status">
            {isTyping ? (
              <span className="typing-text">typing...</span>
            ) : isOnline ? (
              "online"
            ) : selectedUser.lastSeen ? (
              `last seen ${format(new Date(selectedUser.lastSeen), "MMM d 'at' HH:mm")}`
            ) : (
              "offline"
            )}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-area">
        {loadingMessages ? (
          <div className="messages-loading">
            <div className="spinner"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="messages-empty">
            <div className="messages-empty-card">
              🔒 Messages are end-to-end encrypted. Say hello to{" "}
              <strong>{selectedUser.username}</strong>!
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMine =
                (msg.sender._id || msg.sender) === user._id;
              const showDate = shouldShowDateSeparator(messages, i);

              return (
                <React.Fragment key={msg._id}>
                  {showDate && (
                    <div className="date-separator">
                      <span>{formatMessageDate(msg.createdAt)}</span>
                    </div>
                  )}
                  <div className={`message ${isMine ? "outgoing" : "incoming"}`}>
                    <div className="message-bubble">
                      <p className="message-text">{msg.content}</p>
                      <div className="message-meta">
                        <span className="message-time">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                        {isMine && (
                          <span className="message-ticks" title={msg.isRead ? "Read" : "Delivered"}>
                            {msg.isRead ? (
                              <svg viewBox="0 0 18 18" fill="#53bdeb" width="16" height="16">
                                <path d="M17.394 5.035l-.57-.444a.434.434 0 0 0-.609.076L8.297 15.17l-4.786-3.918a.434.434 0 0 0-.609.076l-.444.57a.434.434 0 0 0 .076.609l5.715 4.679a.5.5 0 0 0 .644-.019L17.47 5.644a.434.434 0 0 0-.076-.609zm-2.53 0l-.57-.444a.434.434 0 0 0-.609.076L5.768 15.17l-2.569-2.1a.434.434 0 0 0-.609.076l-.444.57a.434.434 0 0 0 .076.609l3.298 2.7a.5.5 0 0 0 .644-.019L14.94 5.644a.434.434 0 0 0-.076-.609z"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 18 18" fill="#8696a0" width="16" height="16">
                                <path d="M17.394 5.035l-.57-.444a.434.434 0 0 0-.609.076L8.297 15.17l-4.786-3.918a.434.434 0 0 0-.609.076l-.444.57a.434.434 0 0 0 .076.609l5.715 4.679a.5.5 0 0 0 .644-.019L17.47 5.644a.434.434 0 0 0-.076-.609z"/>
                              </svg>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            {isTyping && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area">
        {error && <div className="input-error">{error}</div>}
        <div className="input-row">
          <button className="icon-btn emoji-btn" title="Emoji" disabled>
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-3.5-7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-3.5 5a4.5 4.5 0 0 0 4.32-3.27.5.5 0 0 0-.64-.63 8.73 8.73 0 0 1-7.36 0 .5.5 0 0 0-.64.63A4.5 4.5 0 0 0 12 17.5z"/>
            </svg>
          </button>

          <textarea
            ref={inputRef}
            className="message-input"
            placeholder="Type a message"
            value={input}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={4096}
          />

          <button
            className={`send-btn ${input.trim() ? "active" : ""}`}
            onClick={handleSend}
            disabled={!input.trim() || sending}
            title="Send message"
          >
            {input.trim() ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.468 2.35 8.468 4.35v7.061c0 2.001 1.53 3.531 3.531 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.001z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;

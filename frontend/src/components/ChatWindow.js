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
    <div className="message-bubble">
      <div className="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  </div>
);

const ChatWindow = ({ onBack }) => {
  const { user } = useAuth();
  const { selectedUser, messages, loadingMessages, sendMessage, emitTyping, emitStopTyping, isUserOnline, typingUsers } = useChat();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const isOnline = selectedUser ? isUserOnline(selectedUser._id) : false;
  const isTyping = selectedUser ? !!typingUsers[selectedUser._id] : false;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);
  useEffect(() => { if (selectedUser) inputRef.current?.focus(); }, [selectedUser]);

  const handleTyping = useCallback((e) => {
    setInput(e.target.value);
    emitTyping();
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { emitStopTyping(); }, 2000);
  }, [emitTyping, emitStopTyping]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput(""); setError(""); setSending(true);
    emitStopTyping(); clearTimeout(typingTimeoutRef.current);
    try { await sendMessage(trimmed); }
    catch (err) { setError(err.message || "Failed to send message"); setInput(trimmed); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!selectedUser) {
    return (
      <div className="chat-welcome">
        <div className="chat-welcome-inner">
          <div className="chat-welcome-icon">
            <svg viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" width="260">
              <rect x="40" y="20" width="240" height="150" rx="10" fill="#202c33" stroke="#374045" strokeWidth="1.5"/>
              <rect x="55" y="35" width="210" height="120" rx="4" fill="#0b141a"/>
              <circle cx="160" cy="95" r="36" fill="#2a3942"/>
              <path d="M148 83c0-1.1.9-2 2-2h20c1.1 0 2 .9 2 2v24c0 1.1-.9 2-2 2h-20c-1.1 0-2-.9-2-2V83zm10 22h4v-2h-4v2zm-2-18v14h16V87h-16z" fill="#8696a0"/>
              <rect x="100" y="170" width="120" height="6" rx="3" fill="#374045"/>
            </svg>
          </div>
          <h2>WhatsApp Web</h2>
          <p>Send and receive messages without keeping your phone online.<br/>Use WhatsApp on up to 4 linked devices and 1 phone.</p>
          <div className="chat-welcome-hint">
            <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7V7h2v5zm0-6H7V4h2v2z"/></svg>
            Select a contact on the left to start chatting
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        {onBack && (
          <button className="icon-btn back-btn" onClick={onBack} title="Back">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
        )}
        <Avatar user={selectedUser} size={40} showOnline isOnline={isOnline} />
        <div className="chat-header-info">
          <h3 className="chat-header-name">{selectedUser.username}</h3>
          <p className="chat-header-status">
            {isTyping ? <span className="typing-text">typing...</span>
              : isOnline ? "online"
              : selectedUser.lastSeen ? `last seen ${format(new Date(selectedUser.lastSeen), "MMM d 'at' HH:mm")}`
              : "offline"}
          </p>
        </div>
        <div className="chat-header-actions">
          <button className="icon-btn" title="Video call">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          </button>
          <button className="icon-btn" title="Search">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </button>
          <button className="icon-btn" title="More options">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </button>
        </div>
      </div>

      <div className="messages-area">
        {loadingMessages ? (
          <div className="messages-loading"><div className="spinner"></div></div>
        ) : messages.length === 0 ? (
          <div className="messages-empty">
            <div className="messages-empty-card">
              🔒 Messages are end-to-end encrypted. Say hello to <strong>{selectedUser.username}</strong>!
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMine = (msg.sender._id || msg.sender) === user._id;
              const showDate = shouldShowDateSeparator(messages, i);
              return (
                <React.Fragment key={msg._id}>
                  {showDate && <div className="date-separator"><span>{formatMessageDate(msg.createdAt)}</span></div>}
                  <div className={`message ${isMine ? "outgoing" : "incoming"}`}>
                    <div className="message-bubble">
                      <p className="message-text">{msg.content}</p>
                      <div className="message-meta">
                        <span className="message-time">{formatMessageTime(msg.createdAt)}</span>
                        {isMine && (
                          <span className="message-ticks" title={msg.isRead ? "Read" : "Delivered"}>
                            {msg.isRead ? (
                              <svg viewBox="0 0 18 18" fill="#53bdeb" width="16" height="16"><path d="M17.394 5.035l-.57-.444a.434.434 0 0 0-.609.076L8.297 15.17l-4.786-3.918a.434.434 0 0 0-.609.076l-.444.57a.434.434 0 0 0 .076.609l5.715 4.679a.5.5 0 0 0 .644-.019L17.47 5.644a.434.434 0 0 0-.076-.609zm-2.53 0l-.57-.444a.434.434 0 0 0-.609.076L5.768 15.17l-2.569-2.1a.434.434 0 0 0-.609.076l-.444.57a.434.434 0 0 0 .076.609l3.298 2.7a.5.5 0 0 0 .644-.019L14.94 5.644a.434.434 0 0 0-.076-.609z"/></svg>
                            ) : (
                              <svg viewBox="0 0 18 18" fill="#8696a0" width="16" height="16"><path d="M17.394 5.035l-.57-.444a.434.434 0 0 0-.609.076L8.297 15.17l-4.786-3.918a.434.434 0 0 0-.609.076l-.444.57a.434.434 0 0 0 .076.609l5.715 4.679a.5.5 0 0 0 .644-.019L17.47 5.644a.434.434 0 0 0-.076-.609z"/></svg>
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

      <div className="input-area">
        {error && <div className="input-error">{error}</div>}
        <div className="input-row">
          <div className="input-pill">
            <button className="icon-btn emoji-btn" title="Emoji" disabled>
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-3.5-7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-3.5 5a4.5 4.5 0 0 0 4.32-3.27.5.5 0 0 0-.64-.63 8.73 8.73 0 0 1-7.36 0 .5.5 0 0 0-.64.63A4.5 4.5 0 0 0 12 17.5z"/></svg>
            </button>
            <button className="icon-btn emoji-btn" title="Attach" disabled>
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
            </button>
            <textarea ref={inputRef} className="message-input" placeholder="Type a message" value={input} onChange={handleTyping} onKeyDown={handleKeyDown} rows={1} maxLength={4096} />
          </div>
          <button className={`send-btn ${!input.trim() ? "mic" : ""}`} onClick={input.trim() ? handleSend : undefined} disabled={sending} title={input.trim() ? "Send message" : "Record voice message"}>
            {input.trim() ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
import React, { useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM/yy");
};

const Avatar = ({ user, size = 46, showOnline = false, isOnline = false }) => {
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";
  const colors = [
    "#25D366","#128C7E","#075E54","#34B7F1","#00BCD4",
    "#9C27B0","#E91E63","#FF5722","#FF9800","#8BC34A",
  ];
  const colorIdx = user?.username
    ? user.username.charCodeAt(0) % colors.length
    : 0;

  return (
    <div className="avatar-wrapper" style={{ width: size, height: size }}>
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={user.username}
          className="avatar-img"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="avatar-initials"
          style={{
            width: size,
            height: size,
            background: colors[colorIdx],
            fontSize: size * 0.35,
          }}
        >
          {initials}
        </div>
      )}
      {showOnline && isOnline && (
        <span className="online-dot online" />
      )}
    </div>
  );
};

// onSelectUser is passed from ChatPage for mobile handling
const Sidebar = ({ onSelectUser }) => {
  const { user, logout } = useAuth();
  const { users, selectedUser, selectUser, unreadCounts, isUserOnline } = useChat();
  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleUserClick = (u) => {
    if (onSelectUser) {
      // Mobile: use parent handler which also toggles view
      onSelectUser(u);
    } else {
      // Desktop: just select
      selectUser(u);
    }
  };

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <Avatar user={user} size={40} />
        <div className="sidebar-actions">
          {/* New chat icon */}
          <button className="icon-btn" title="New chat">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          </button>
          {/* Menu */}
          <button
            className="icon-btn"
            title="Menu"
            onClick={() => setShowMenu(!showMenu)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          {showMenu && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={logout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" className="search-icon">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder="Search or start new chat"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* User list */}
      <div className="user-list">
        {filtered.length === 0 ? (
          <div className="empty-list">
            {search ? "No users found" : "No other users yet"}
          </div>
        ) : (
          filtered.map((u) => {
            const online = isUserOnline(u._id);
            const unread = unreadCounts[u._id] || 0;
            const isActive = selectedUser?._id === u._id;

            return (
              <div
                key={u._id}
                className={`user-item ${isActive ? "active" : ""}`}
                onClick={() => handleUserClick(u)}
              >
                <Avatar user={u} size={46} showOnline isOnline={online} />
                <div className="user-item-info">
                  <div className="user-item-top">
                    <span className="user-name">{u.username}</span>
                    {u.lastSeen && (
                      <span className={`user-time ${unread > 0 ? "unread-time" : ""}`}>
                        {formatTime(u.lastSeen)}
                      </span>
                    )}
                  </div>
                  <div className="user-item-bottom">
                    <span className="user-status">
                      {online ? "online" : u.status || "offline"}
                    </span>
                    {unread > 0 && (
                      <span className="unread-badge">{unread > 99 ? "99+" : unread}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export { Avatar };
export default Sidebar;
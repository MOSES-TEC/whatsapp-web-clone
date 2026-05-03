import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { ChatProvider } from "../context/ChatContext";
import { useChat } from "../context/ChatContext";

// Inner component so it can access ChatContext
const ChatLayout = () => {
  const { selectedUser, selectUser } = useChat();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // When a user is selected on mobile, show the chat panel
  const handleSelectUser = (user) => {
    selectUser(user);
    if (isMobile) setShowChat(true);
  };

  // Back button on mobile goes back to sidebar
  const handleBack = () => {
    setShowChat(false);
  };

  if (isMobile) {
    return (
      <div className="app-container">
        {!showChat ? (
          <Sidebar onSelectUser={handleSelectUser} />
        ) : (
          <ChatWindow onBack={handleBack} />
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar onSelectUser={handleSelectUser} />
      <ChatWindow />
    </div>
  );
};

const ChatPage = () => {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
};

export default ChatPage;
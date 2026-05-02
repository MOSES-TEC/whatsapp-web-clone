import React from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { ChatProvider } from "../context/ChatContext";

const ChatPage = () => {
  return (
    <ChatProvider>
      <div className="app-container">
        <Sidebar />
        <ChatWindow />
      </div>
    </ChatProvider>
  );
};

export default ChatPage;

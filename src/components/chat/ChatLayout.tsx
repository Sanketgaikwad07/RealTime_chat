import { useState } from "react";
import ConversationList from "./ConversationList";
import MessageArea from "./MessageArea";
import { useChat } from "@/context/ChatContext";

const ChatLayout = () => {
  const { activeRoom } = useChat();
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const handleBack = () => setMobileShowChat(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={`${
          mobileShowChat && activeRoom ? "hidden md:flex" : "flex"
        } w-full md:w-[340px] lg:w-[380px] flex-col border-r border-border shrink-0`}
        onClick={() => setMobileShowChat(true)}
      >
        <ConversationList />
      </div>

      {/* Chat Area */}
      <div
        className={`${
          !mobileShowChat && !activeRoom ? "hidden md:flex" : mobileShowChat ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0`}
      >
        <MessageArea onBack={handleBack} />
      </div>
    </div>
  );
};

export default ChatLayout;

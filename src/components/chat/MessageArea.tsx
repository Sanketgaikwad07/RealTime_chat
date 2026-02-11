import { useRef, useEffect, useState } from "react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import ChatAvatar from "./Avatar";
import { format } from "date-fns";
import { Send, Smile, Paperclip, ArrowLeft } from "lucide-react";

interface MessageAreaProps {
  onBack?: () => void;
}

const MessageArea = ({ onBack }: MessageAreaProps) => {
  const { activeRoom, messages, sendMessage, loading, profiles } = useChat();
  const { user, profile } = useAuth();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeRoom) inputRef.current?.focus();
  }, [activeRoom]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Your Messages</h2>
          <p className="text-muted-foreground text-sm">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  const otherUser = activeRoom.participants.find((p) => p.id !== user?.id) || activeRoom.participants[0];
  const displayName = activeRoom.name || otherUser?.username || "Chat";

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-chat-header">
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-accent transition-colors md:hidden">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        )}
        {otherUser && <ChatAvatar user={otherUser} size="md" />}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground text-sm">{displayName}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === user?.id;
            const showTime =
              i === 0 ||
              new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000;

            const senderProfile = profiles[msg.sender_id] || profile;

            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="text-center my-3">
                    <span className="text-xs text-muted-foreground bg-accent px-3 py-1 rounded-full">
                      {format(new Date(msg.created_at), "h:mm a")}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-0.5`}>
                  {!isMine && senderProfile && (
                    <div className="mr-2 self-end">
                      <ChatAvatar user={senderProfile} size="sm" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${
                      isMine
                        ? "bg-chat-sent text-chat-sent-foreground rounded-2xl rounded-br-md"
                        : "bg-chat-received text-chat-received-foreground rounded-2xl rounded-bl-md shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-chat-header">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
            <Paperclip className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
            <Smile className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageArea;

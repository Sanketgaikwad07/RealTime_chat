import { useEffect } from "react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import ChatAvatar from "./Avatar";
import { formatDistanceToNow } from "date-fns";
import { Search, LogOut, MessageSquarePlus } from "lucide-react";
import { useState } from "react";

const ConversationList = () => {
  const { chatRooms, activeRoom, loadChatRooms, selectRoom } = useChat();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadChatRooms();
  }, [loadChatRooms]);

  const filtered = chatRooms.filter((room) => {
    const name =
      room.name || room.participants.find((p) => p.id !== user?.id)?.username || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const getDisplayName = (room: typeof chatRooms[0]) => {
    if (room.name) return room.name;
    const other = room.participants.find((p) => p.id !== user?.id);
    return other?.username || "Unknown";
  };

  const getOtherUser = (room: typeof chatRooms[0]) => {
    return room.participants.find((p) => p.id !== user?.id) || room.participants[0];
  };

  return (
    <div className="flex flex-col h-full bg-chat-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Messages</h1>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
              <MessageSquarePlus className="h-5 w-5" />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-accent text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.map((room) => {
          const otherUser = getOtherUser(room);
          const isActive = activeRoom?.id === room.id;
          const lastMsg = room.lastMessage;

          return (
            <button
              key={room.id}
              onClick={() => selectRoom(room)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                isActive ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <ChatAvatar user={otherUser} showStatus size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm truncate ${isActive ? "text-foreground" : "text-foreground"}`}>
                    {getDisplayName(room)}
                  </span>
                  {lastMsg && (
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(lastMsg.timestamp), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground truncate pr-2">
                    {lastMsg?.content || "No messages yet"}
                  </p>
                  {room.unreadCount > 0 && (
                    <span className="shrink-0 bg-primary text-primary-foreground text-xs font-semibold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                      {room.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ConversationList;

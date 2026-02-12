import { useEffect, useState } from "react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import ChatAvatar from "./Avatar";
import { formatDistanceToNow } from "date-fns";
import { Search, LogOut, MessageSquarePlus, X, CheckCheck, Check } from "lucide-react";
import { Profile } from "@/types/chat";
import { motion, AnimatePresence } from "framer-motion";

const ConversationList = () => {
  const { chatRooms, activeRoom, loadChatRooms, selectRoom, startChat, searchUsers, onlineUsers } = useChat();
  const { profile, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadChatRooms();
  }, [loadChatRooms]);

  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchUsers(userSearch);
      setUserResults(results);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, searchUsers]);

  const filtered = chatRooms.filter((room) => {
    const name = room.name || room.participants.find((p) => p.id !== profile?.id)?.username || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const getDisplayName = (room: typeof chatRooms[0]) => {
    if (room.name) return room.name;
    const other = room.participants.find((p) => p.id !== profile?.id);
    return other?.username || "Unknown";
  };

  const getOtherUser = (room: typeof chatRooms[0]) => {
    return room.participants.find((p) => p.id !== profile?.id) || room.participants[0];
  };

  const handleStartChat = async (otherUser: Profile) => {
    const room = await startChat(otherUser.id);
    if (room) {
      selectRoom(room);
      setShowNewChat(false);
      setUserSearch("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {profile && <ChatAvatar user={profile} size="md" showStatus isOnline />}
            <div>
              <h1 className="text-lg font-bold text-foreground">Messages</h1>
              <p className="text-xs text-muted-foreground">{profile?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              {showNewChat ? <X className="h-5 w-5" /> : <MessageSquarePlus className="h-5 w-5" />}
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
            placeholder={showNewChat ? "Search users to chat..." : "Search conversations..."}
            value={showNewChat ? userSearch : search}
            onChange={(e) => showNewChat ? setUserSearch(e.target.value) : setSearch(e.target.value)}
            autoFocus={showNewChat}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-accent text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
      </div>

      {/* User search results */}
      {showNewChat && (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {searching && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <AnimatePresence>
            {userResults.map((u) => (
              <motion.button
                key={u.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => handleStartChat(u)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
              >
                <ChatAvatar user={u} size="md" showStatus isOnline={onlineUsers.has(u.id)} />
                <div>
                  <span className="font-medium text-sm text-foreground">{u.username}</span>
                  <p className="text-xs text-muted-foreground">
                    {onlineUsers.has(u.id) ? <span className="text-online">Online</span> : "Offline"}
                  </p>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
          {userSearch && !searching && userResults.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
          )}
        </div>
      )}

      {/* Conversation List */}
      {!showNewChat && (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filtered.length === 0 && (
            <div className="text-center py-12 px-4">
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click + to start a new chat</p>
            </div>
          )}
          <AnimatePresence>
            {filtered.map((room) => {
              const otherUser = getOtherUser(room);
              const isActive = activeRoom?.id === room.id;
              const lastMsg = room.lastMessage;
              const isOtherOnline = otherUser ? onlineUsers.has(otherUser.id) : false;

              return (
                <motion.button
                  key={room.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => selectRoom(room)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    isActive ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-accent/50"
                  }`}
                >
                  {otherUser && <ChatAvatar user={otherUser} size="md" showStatus isOnline={isOtherOnline} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium text-sm truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                        {getDisplayName(room)}
                      </span>
                      {lastMsg && (
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {lastMsg && lastMsg.sender_id === profile?.id && (
                        lastMsg.status === "read" ? (
                          <CheckCheck className="h-3 w-3 text-primary shrink-0" />
                        ) : (
                          <Check className="h-3 w-3 text-muted-foreground shrink-0" />
                        )
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {lastMsg?.content || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ConversationList;

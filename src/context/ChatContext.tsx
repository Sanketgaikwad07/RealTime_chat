import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { ChatRoom, MessageRow, Profile } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface ChatContextType {
  chatRooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  messages: MessageRow[];
  profiles: Record<string, Profile>;
  loading: boolean;
  typingUsers: Record<string, string>;
  onlineUsers: Set<string>;
  loadChatRooms: () => Promise<void>;
  selectRoom: (room: ChatRoom) => Promise<void>;
  sendMessage: (content: string, file?: File) => Promise<void>;
  startChat: (otherUserId: string) => Promise<ChatRoom | null>;
  searchUsers: (query: string) => Promise<Profile[]>;
  setTyping: (isTyping: boolean) => void;
  markAsRead: (messageIds: string[]) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const presenceChannelRef = useRef<any>(null);
  const activeRoomRef = useRef<ChatRoom | null>(null);
  const profilesRef = useRef<Record<string, Profile>>({});
  const messagesRef = useRef<MessageRow[]>([]);
  const startChatLockRef = useRef<Set<string>>(new Set());

  // Keep refs in sync
  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);
  useEffect(() => { profilesRef.current = profiles; }, [profiles]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Fetch and cache profiles
  const fetchProfiles = useCallback(async (userIds: string[]): Promise<Record<string, Profile>> => {
    const current = profilesRef.current;
    const missing = userIds.filter((id) => !current[id]);
    if (missing.length === 0) return current;

    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, last_seen, bio")
      .in("id", missing);

    const updated = { ...current };
    data?.forEach((p: any) => (updated[p.id] = p));
    profilesRef.current = updated;
    setProfiles(updated);
    return updated;
  }, []);

  // Invalidate a single cached profile (for profile edits)
  const refreshProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, last_seen, bio")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      const updated = { ...profilesRef.current, [userId]: data };
      profilesRef.current = updated;
      setProfiles(updated);
    }
  }, []);

  // Update last_seen periodically
  useEffect(() => {
    if (!user) return;
    const updatePresence = () => {
      supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", user.id).then(() => {});
    };
    updatePresence();
    const interval = setInterval(updatePresence, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Presence channel for online/offline
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineUsers(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    presenceChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadChatRooms = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: memberships } = await supabase
        .from("room_memberships")
        .select("room_id")
        .eq("user_id", user.id);

      if (!memberships || memberships.length === 0) {
        setChatRooms([]);
        setLoading(false);
        return;
      }

      const roomIds = memberships.map((m) => m.room_id);

      const [roomsRes, allMembershipsRes] = await Promise.all([
        supabase.from("chat_rooms").select("*").in("id", roomIds),
        supabase.from("room_memberships").select("room_id, user_id").in("room_id", roomIds),
      ]);

      const rooms = roomsRes.data;
      const allMemberships = allMembershipsRes.data;

      if (!rooms) { setChatRooms([]); setLoading(false); return; }

      const allUserIds = [...new Set(allMemberships?.map((m) => m.user_id) || [])];
      const profileMap = await fetchProfiles(allUserIds);

      // Batch: get last message per room + unread counts
      const chatRoomList: ChatRoom[] = await Promise.all(
        rooms.map(async (room) => {
          const participants = (allMemberships || [])
            .filter((m) => m.room_id === room.id)
            .map((m) => profileMap[m.user_id])
            .filter(Boolean);

          const [lastMsgRes, unreadRes] = await Promise.all([
            supabase.from("messages").select("*").eq("room_id", room.id).order("created_at", { ascending: false }).limit(1),
            supabase.from("messages").select("*", { count: "exact", head: true }).eq("room_id", room.id).neq("sender_id", user.id).neq("status", "read"),
          ]);

          return {
            ...room,
            participants,
            lastMessage: lastMsgRes.data?.[0] || undefined,
            unreadCount: unreadRes.count || 0,
          };
        })
      );

      chatRoomList.sort((a, b) => {
        const ta = a.lastMessage?.created_at || a.created_at;
        const tb = b.lastMessage?.created_at || b.created_at;
        return new Date(tb).getTime() - new Date(ta).getTime();
      });

      setChatRooms(chatRoomList);
    } catch (err) {
      console.error("Failed to load chat rooms:", err);
    }
    setLoading(false);
  }, [user, fetchProfiles]);

  const selectRoom = useCallback(async (room: ChatRoom) => {
    setActiveRoom(room);
    setMessages([]);
    setLoading(true);
    setTypingUsers({});

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", room.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load messages:", error);
        setLoading(false);
        return;
      }

      const msgs = data || [];
      const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
      if (senderIds.length > 0) await fetchProfiles(senderIds);

      setMessages(msgs);

      // Mark unread messages as read
      if (msgs.length > 0 && user) {
        const unread = msgs.filter(m => m.sender_id !== user.id && m.status !== "read");
        if (unread.length > 0) {
          await supabase
            .from("messages")
            .update({ status: "read" })
            .in("id", unread.map(m => m.id));
          // Update local state too
          setMessages(prev => prev.map(m => 
            unread.some(u => u.id === m.id) ? { ...m, status: "read" } : m
          ));
        }
      }
    } catch (err) {
      console.error("Error selecting room:", err);
    }
    setLoading(false);
  }, [fetchProfiles, user]);

  const sendMessage = useCallback(async (content: string, file?: File) => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom || !user) return;
    if (!content.trim() && !file) return; // Prevent empty messages

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;

    if (file) {
      const ext = file.name.split(".").pop();
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const path = `${user.id}/${safeName}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("chat-files")
        .upload(path, file);

      if (uploadErr) {
        console.error("File upload failed:", uploadErr);
        return;
      }
      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      fileName = file.name;
      fileType = file.type;
    }

    const msgContent = content || (fileName ? `Sent a file: ${fileName}` : "");

    // Optimistic message with a temp ID
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticMsg: MessageRow = {
      id: tempId,
      room_id: currentRoom.id,
      sender_id: user.id,
      content: msgContent,
      created_at: new Date().toISOString(),
      status: "sent",
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabase.from("messages").insert({
      room_id: currentRoom.id,
      sender_id: user.id,
      content: msgContent,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
    }).select().single();

    if (error) {
      console.error("Send error:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else if (data) {
      // Replace optimistic with real message
      setMessages((prev) => prev.map((m) => m.id === tempId ? data : m));
    }
  }, [user]);

  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    await supabase.from("messages").update({ status: "read" }).in("id", messageIds);
    setMessages(prev => prev.map(m => messageIds.includes(m.id) ? { ...m, status: "read" } : m));
  }, []);

  const startChat = useCallback(async (otherUserId: string): Promise<ChatRoom | null> => {
    if (!user) return null;
    if (otherUserId === user.id) return null; // Prevent self-chat

    // Lock to prevent duplicate room creation
    const lockKey = [user.id, otherUserId].sort().join("-");
    if (startChatLockRef.current.has(lockKey)) return null;
    startChatLockRef.current.add(lockKey);

    try {
      // Check for existing private room
      const { data: myRooms } = await supabase
        .from("room_memberships")
        .select("room_id")
        .eq("user_id", user.id);

      if (myRooms) {
        for (const r of myRooms) {
          const { data: otherMember } = await supabase
            .from("room_memberships")
            .select("user_id")
            .eq("room_id", r.room_id)
            .eq("user_id", otherUserId)
            .maybeSingle();

          if (otherMember) {
            const { data: room } = await supabase
              .from("chat_rooms")
              .select("*")
              .eq("id", r.room_id)
              .eq("type", "private")
              .maybeSingle();
            if (room) {
              const profileMap = await fetchProfiles([user.id, otherUserId]);
              const chatRoom: ChatRoom = {
                ...room,
                participants: [profileMap[user.id], profileMap[otherUserId]].filter(Boolean),
                unreadCount: 0,
              };
              await loadChatRooms();
              return chatRoom;
            }
          }
        }
      }

      // Create new room
      const { data: newRoom, error: roomErr } = await supabase
        .from("chat_rooms")
        .insert({ type: "private", created_by: user.id })
        .select()
        .single();

      if (roomErr || !newRoom) {
        console.error("Failed to create room:", roomErr);
        return null;
      }

      const { error: memberErr } = await supabase.from("room_memberships").insert([
        { room_id: newRoom.id, user_id: user.id },
        { room_id: newRoom.id, user_id: otherUserId },
      ]);

      if (memberErr) {
        console.error("Failed to add memberships:", memberErr);
        return null;
      }

      const profileMap = await fetchProfiles([user.id, otherUserId]);
      const chatRoom: ChatRoom = {
        ...newRoom,
        participants: [profileMap[user.id], profileMap[otherUserId]].filter(Boolean),
        unreadCount: 0,
      };

      await loadChatRooms();
      return chatRoom;
    } finally {
      startChatLockRef.current.delete(lockKey);
    }
  }, [user, fetchProfiles, loadChatRooms]);

  const searchUsers = useCallback(async (query: string): Promise<Profile[]> => {
    if (!query.trim() || !user) return [];
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .neq("id", user.id)
      .ilike("username", `%${query}%`)
      .limit(10);
    return data || [];
  }, [user]);

  // Typing indicator via broadcast
  const setTyping = useCallback((isTyping: boolean) => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom || !user) return;
    const channel = supabase.channel(`typing:${currentRoom.id}`);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "typing",
          payload: { userId: user.id, username: profilesRef.current[user.id]?.username || "Someone", isTyping },
        });
        setTimeout(() => supabase.removeChannel(channel), 100);
      }
    });
  }, [user]);

  // Listen for typing in active room
  useEffect(() => {
    if (!activeRoom || !user) return;

    const channel = supabase
      .channel(`typing-listen:${activeRoom.id}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, username, isTyping } = payload.payload;
        if (userId === user.id) return;

        if (isTyping) {
          setTypingUsers(prev => ({ ...prev, [userId]: username }));
          if (typingTimeoutRef.current[userId]) clearTimeout(typingTimeoutRef.current[userId]);
          typingTimeoutRef.current[userId] = setTimeout(() => {
            setTypingUsers(prev => {
              const next = { ...prev };
              delete next[userId];
              return next;
            });
          }, 3000);
        } else {
          setTypingUsers(prev => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeRoom?.id, user]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new as MessageRow;
          const currentActive = activeRoomRef.current;

          // Fetch sender profile if not cached
          if (!profilesRef.current[newMsg.sender_id]) {
            await fetchProfiles([newMsg.sender_id]);
          }

          if (currentActive && newMsg.room_id === currentActive.id) {
            setMessages((prev) => {
              // Deduplicate: skip if real ID exists or if it's our optimistic msg
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              // If this is from current user, the optimistic msg is already there
              // Replace any temp message for this content
              if (newMsg.sender_id === user.id) {
                const tempIdx = prev.findIndex(
                  m => m.id.startsWith("temp-") && m.sender_id === user.id && m.content === newMsg.content
                );
                if (tempIdx >= 0) {
                  const updated = [...prev];
                  updated[tempIdx] = newMsg;
                  return updated;
                }
              }
              return [...prev, newMsg];
            });

            // Auto-mark as read if from other user, update to delivered first
            if (newMsg.sender_id !== user.id) {
              supabase.from("messages").update({ status: "read" }).eq("id", newMsg.id).then(() => {});
            }
          } else if (newMsg.sender_id !== user.id) {
            // Message in a different room - mark as delivered
            supabase.from("messages").update({ status: "delivered" }).eq("id", newMsg.id).eq("status", "sent").then(() => {});
          }

          // Update last message and unread count in room list
          setChatRooms((prev) => {
            const updated = prev.map((r) => {
              if (r.id !== newMsg.room_id) return r;
              const isActiveRoom = currentActive?.id === newMsg.room_id;
              return {
                ...r,
                lastMessage: newMsg,
                unreadCount: (!isActiveRoom && newMsg.sender_id !== user.id) ? r.unreadCount + 1 : r.unreadCount,
              };
            });
            return updated.sort((a, b) => {
              const ta = a.lastMessage?.created_at || a.created_at;
              const tb = b.lastMessage?.created_at || b.created_at;
              return new Date(tb).getTime() - new Date(ta).getTime();
            });
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = payload.new as MessageRow;
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, status: updated.status } : m));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchProfiles]);

  return (
    <ChatContext.Provider
      value={{ chatRooms, activeRoom, messages, profiles, loading, typingUsers, onlineUsers, loadChatRooms, selectRoom, sendMessage, startChat, searchUsers, setTyping, markAsRead }}
    >
      {children}
    </ChatContext.Provider>
  );
};

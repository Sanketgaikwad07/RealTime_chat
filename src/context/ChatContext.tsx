import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { ChatRoom, MessageRow, Profile } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface ChatContextType {
  chatRooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  messages: MessageRow[];
  profiles: Record<string, Profile>;
  loading: boolean;
  loadChatRooms: () => Promise<void>;
  selectRoom: (room: ChatRoom) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  startChat: (otherUserId: string) => Promise<ChatRoom | null>;
  searchUsers: (query: string) => Promise<Profile[]>;
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

  // Cache profiles
  const fetchProfiles = useCallback(async (userIds: string[]) => {
    const missing = userIds.filter((id) => !profiles[id]);
    if (missing.length === 0) return profiles;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", missing);
    const updated = { ...profiles };
    data?.forEach((p) => (updated[p.id] = p));
    setProfiles(updated);
    return updated;
  }, [profiles]);

  const loadChatRooms = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get rooms user belongs to
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

    // Get rooms
    const { data: rooms } = await supabase
      .from("chat_rooms")
      .select("*")
      .in("id", roomIds);

    if (!rooms) {
      setChatRooms([]);
      setLoading(false);
      return;
    }

    // Get all memberships for these rooms to find participants
    const { data: allMemberships } = await supabase
      .from("room_memberships")
      .select("room_id, user_id")
      .in("room_id", roomIds);

    // Get all participant profiles
    const allUserIds = [...new Set(allMemberships?.map((m) => m.user_id) || [])];
    const profileMap = await fetchProfiles(allUserIds);

    // Get last message for each room
    const chatRoomList: ChatRoom[] = [];
    for (const room of rooms) {
      const participants = (allMemberships || [])
        .filter((m) => m.room_id === room.id)
        .map((m) => profileMap[m.user_id])
        .filter(Boolean);

      // Get last message
      const { data: lastMsgArr } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(1);

      chatRoomList.push({
        ...room,
        participants,
        lastMessage: lastMsgArr?.[0] || undefined,
        unreadCount: 0,
      });
    }

    // Sort by last message time
    chatRoomList.sort((a, b) => {
      const ta = a.lastMessage?.created_at || a.created_at;
      const tb = b.lastMessage?.created_at || b.created_at;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });

    setChatRooms(chatRoomList);
    setLoading(false);
  }, [user, fetchProfiles]);

  const selectRoom = useCallback(async (room: ChatRoom) => {
    setActiveRoom(room);
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });

    // Fetch sender profiles
    const senderIds = [...new Set(data?.map((m) => m.sender_id) || [])];
    await fetchProfiles(senderIds);

    setMessages(data || []);
    setLoading(false);
  }, [fetchProfiles]);

  const sendMessage = useCallback(async (content: string) => {
    if (!activeRoom || !user) return;
    const { error } = await supabase.from("messages").insert({
      room_id: activeRoom.id,
      sender_id: user.id,
      content,
    });
    if (error) console.error("Send error:", error);
  }, [activeRoom, user]);

  const startChat = useCallback(async (otherUserId: string): Promise<ChatRoom | null> => {
    if (!user) return null;

    // Check if private chat already exists
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

    if (roomErr || !newRoom) return null;

    // Add both members
    await supabase.from("room_memberships").insert([
      { room_id: newRoom.id, user_id: user.id },
      { room_id: newRoom.id, user_id: otherUserId },
    ]);

    const profileMap = await fetchProfiles([user.id, otherUserId]);
    const chatRoom: ChatRoom = {
      ...newRoom,
      participants: [profileMap[user.id], profileMap[otherUserId]].filter(Boolean),
      unreadCount: 0,
    };

    await loadChatRooms();
    return chatRoom;
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

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as MessageRow;
          // If viewing this room, add to messages
          if (activeRoom && newMsg.room_id === activeRoom.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          // Update chat rooms list
          setChatRooms((prev) =>
            prev.map((r) =>
              r.id === newMsg.room_id ? { ...r, lastMessage: newMsg } : r
            ).sort((a, b) => {
              const ta = a.lastMessage?.created_at || a.created_at;
              const tb = b.lastMessage?.created_at || b.created_at;
              return new Date(tb).getTime() - new Date(ta).getTime();
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeRoom]);

  return (
    <ChatContext.Provider
      value={{ chatRooms, activeRoom, messages, profiles, loading, loadChatRooms, selectRoom, sendMessage, startChat, searchUsers }}
    >
      {children}
    </ChatContext.Provider>
  );
};

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ChatRoom, Message } from "@/types/chat";
import { chatApi } from "@/services/api";

interface ChatContextType {
  chatRooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  messages: Message[];
  loading: boolean;
  loadChatRooms: () => Promise<void>;
  selectRoom: (room: ChatRoom) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChatRooms = useCallback(async () => {
    setLoading(true);
    const rooms = await chatApi.getChatRooms();
    setChatRooms(rooms);
    setLoading(false);
  }, []);

  const selectRoom = useCallback(async (room: ChatRoom) => {
    setActiveRoom(room);
    setLoading(true);
    const msgs = await chatApi.getMessages(room.id);
    setMessages(msgs);
    setLoading(false);
    // Mark as read
    setChatRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, unreadCount: 0 } : r))
    );
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!activeRoom) return;
    const msg = await chatApi.sendMessage(activeRoom.id, content);
    setMessages((prev) => [...prev, msg]);
    setChatRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoom.id ? { ...r, lastMessage: msg } : r
      )
    );
  }, [activeRoom]);

  return (
    <ChatContext.Provider value={{ chatRooms, activeRoom, messages, loading, loadChatRooms, selectRoom, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
};

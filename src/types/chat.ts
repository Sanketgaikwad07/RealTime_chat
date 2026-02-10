export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  online: boolean;
  lastSeen?: string;
}

export interface Message {
  id: string;
  senderId: string;
  chatRoomId: string;
  content: string;
  timestamp: string;
  readStatus: boolean;
}

export interface ChatRoom {
  id: string;
  name?: string;
  type: "private" | "group";
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

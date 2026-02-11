export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface ChatRoom {
  id: string;
  name: string | null;
  type: string;
  created_by: string | null;
  created_at: string;
  // Joined client-side
  participants: Profile[];
  lastMessage?: MessageRow;
  unreadCount: number;
}

export interface MessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  // Joined client-side
  sender?: Profile;
}

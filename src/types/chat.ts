export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  last_seen?: string;
}

export interface ChatRoom {
  id: string;
  name: string | null;
  type: string;
  created_by: string | null;
  created_at: string;
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
  status: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  sender?: Profile;
}

export interface CallSignal {
  id: string;
  room_id: string;
  caller_id: string;
  callee_id: string;
  type: string;
  payload: any;
  created_at: string;
}

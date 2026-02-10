import { User, Message, ChatRoom } from "@/types/chat";

export const currentUser: User = {
  id: "u1",
  username: "You",
  email: "you@example.com",
  online: true,
};

export const mockUsers: User[] = [
  { id: "u2", username: "Sarah Chen", email: "sarah@example.com", online: true, avatar: "" },
  { id: "u3", username: "Alex Rivera", email: "alex@example.com", online: true, avatar: "" },
  { id: "u4", username: "Jordan Lee", email: "jordan@example.com", online: false, lastSeen: "2026-02-10T09:30:00Z", avatar: "" },
  { id: "u5", username: "Maya Patel", email: "maya@example.com", online: true, avatar: "" },
  { id: "u6", username: "Liam O'Brien", email: "liam@example.com", online: false, lastSeen: "2026-02-09T18:00:00Z", avatar: "" },
];

const now = new Date();
const mins = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

export const mockMessages: Record<string, Message[]> = {
  r1: [
    { id: "m1", senderId: "u2", chatRoomId: "r1", content: "Hey! Are you coming to the standup?", timestamp: mins(45), readStatus: true },
    { id: "m2", senderId: "u1", chatRoomId: "r1", content: "Yes, I'll be there in 5!", timestamp: mins(44), readStatus: true },
    { id: "m3", senderId: "u2", chatRoomId: "r1", content: "Great, we need to discuss the new chat feature 😄", timestamp: mins(43), readStatus: true },
    { id: "m4", senderId: "u1", chatRoomId: "r1", content: "Already working on it! The UI is looking really good", timestamp: mins(30), readStatus: true },
    { id: "m5", senderId: "u2", chatRoomId: "r1", content: "Can't wait to see it! Share a screenshot when you can", timestamp: mins(5), readStatus: false },
  ],
  r2: [
    { id: "m6", senderId: "u3", chatRoomId: "r2", content: "Did you see the new design specs?", timestamp: mins(120), readStatus: true },
    { id: "m7", senderId: "u1", chatRoomId: "r2", content: "Not yet, can you send me the link?", timestamp: mins(119), readStatus: true },
    { id: "m8", senderId: "u3", chatRoomId: "r2", content: "Sure! Check your email, just sent it over", timestamp: mins(60), readStatus: true },
  ],
  r3: [
    { id: "m9", senderId: "u4", chatRoomId: "r3", content: "The deployment went smoothly", timestamp: mins(300), readStatus: true },
    { id: "m10", senderId: "u1", chatRoomId: "r3", content: "Awesome! No issues at all?", timestamp: mins(299), readStatus: true },
    { id: "m11", senderId: "u4", chatRoomId: "r3", content: "Zero downtime 🎉", timestamp: mins(298), readStatus: true },
  ],
  r4: [
    { id: "m12", senderId: "u5", chatRoomId: "r4", content: "Hey team! Sprint planning at 3pm today", timestamp: mins(15), readStatus: false },
    { id: "m13", senderId: "u3", chatRoomId: "r4", content: "I'll be there!", timestamp: mins(10), readStatus: false },
    { id: "m14", senderId: "u2", chatRoomId: "r4", content: "Same here 👍", timestamp: mins(8), readStatus: false },
  ],
  r5: [
    { id: "m15", senderId: "u6", chatRoomId: "r5", content: "Can you review my PR when you get a chance?", timestamp: mins(600), readStatus: true },
  ],
};

export const mockChatRooms: ChatRoom[] = [
  {
    id: "r1",
    type: "private",
    participants: [currentUser, mockUsers[0]],
    lastMessage: mockMessages.r1[mockMessages.r1.length - 1],
    unreadCount: 1,
  },
  {
    id: "r2",
    type: "private",
    participants: [currentUser, mockUsers[1]],
    lastMessage: mockMessages.r2[mockMessages.r2.length - 1],
    unreadCount: 0,
  },
  {
    id: "r3",
    type: "private",
    participants: [currentUser, mockUsers[2]],
    lastMessage: mockMessages.r3[mockMessages.r3.length - 1],
    unreadCount: 0,
  },
  {
    id: "r4",
    name: "Dev Team",
    type: "group",
    participants: [currentUser, mockUsers[0], mockUsers[1], mockUsers[3]],
    lastMessage: mockMessages.r4[mockMessages.r4.length - 1],
    unreadCount: 3,
  },
  {
    id: "r5",
    type: "private",
    participants: [currentUser, mockUsers[4]],
    lastMessage: mockMessages.r5[mockMessages.r5.length - 1],
    unreadCount: 0,
  },
];

/**
 * API Service Layer
 * 
 * Replace these mock implementations with real API calls to your Spring Boot backend.
 * Base URL example: const API_BASE = "http://localhost:8080/api";
 * 
 * All endpoints mirror a typical Spring Boot REST controller structure:
 * - POST /api/auth/login
 * - POST /api/auth/register
 * - GET  /api/chatrooms
 * - GET  /api/chatrooms/:id/messages
 * - POST /api/chatrooms/:id/messages
 */

import { mockChatRooms, mockMessages, currentUser } from "./mockData";
import { ChatRoom, Message, User } from "@/types/chat";

// Simulate network delay
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const authApi = {
  login: async (email: string, _password: string): Promise<{ user: User; token: string }> => {
    await delay(600);
    // Replace with: POST /api/auth/login { email, password }
    return { user: { ...currentUser, email }, token: "mock-jwt-token" };
  },

  register: async (username: string, email: string, _password: string): Promise<{ user: User; token: string }> => {
    await delay(600);
    // Replace with: POST /api/auth/register { username, email, password }
    return { user: { ...currentUser, username, email }, token: "mock-jwt-token" };
  },
};

export const chatApi = {
  getChatRooms: async (): Promise<ChatRoom[]> => {
    await delay(300);
    // Replace with: GET /api/chatrooms (Authorization: Bearer <token>)
    return mockChatRooms;
  },

  getMessages: async (chatRoomId: string): Promise<Message[]> => {
    await delay(200);
    // Replace with: GET /api/chatrooms/:id/messages
    return mockMessages[chatRoomId] || [];
  },

  sendMessage: async (chatRoomId: string, content: string): Promise<Message> => {
    await delay(100);
    // Replace with: POST /api/chatrooms/:id/messages { content }
    // In production, also send via WebSocket for real-time delivery
    const msg: Message = {
      id: `m${Date.now()}`,
      senderId: currentUser.id,
      chatRoomId,
      content,
      timestamp: new Date().toISOString(),
      readStatus: false,
    };
    if (!mockMessages[chatRoomId]) mockMessages[chatRoomId] = [];
    mockMessages[chatRoomId].push(msg);
    return msg;
  },
};

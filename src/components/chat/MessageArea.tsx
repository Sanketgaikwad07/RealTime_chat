import { useRef, useEffect, useState } from "react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import ChatAvatar from "./Avatar";
import FilePreview from "./FilePreview";
import EmojiPicker from "./EmojiPicker";
import TypingIndicator from "./TypingIndicator";
import CallUI from "./CallUI";
import { useWebRTC } from "@/hooks/useWebRTC";
import { format } from "date-fns";
import { Send, Smile, Paperclip, ArrowLeft, Phone, Video, Check, CheckCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MessageAreaProps {
  onBack?: () => void;
}

const MessageArea = ({ onBack }: MessageAreaProps) => {
  const { activeRoom, messages, sendMessage, loading, profiles, typingUsers, onlineUsers, setTyping } = useChat();
  const { user, profile } = useAuth();
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { callState, callType, remoteUserId, localStream, remoteStream, startCall, acceptCall, rejectCall, endCall } = useWebRTC();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  useEffect(() => {
    if (activeRoom) inputRef.current?.focus();
  }, [activeRoom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;
    const content = input.trim();
    setInput("");
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setTyping(false);
    await sendMessage(content, selectedFile || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const otherUser = activeRoom?.participants.find((p) => p.id !== user?.id) || activeRoom?.participants[0];
  const remoteProfile = remoteUserId ? profiles[remoteUserId] : null;

  if (!activeRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-5">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Your Messages</h2>
          <p className="text-muted-foreground text-sm">Select a conversation to start chatting</p>
        </motion.div>
      </div>
    );
  }

  const displayName = activeRoom.name || otherUser?.username || "Chat";
  const isOtherOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
  const typingUsernames = Object.values(typingUsers);

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      {/* Call UI */}
      <CallUI
        callState={callState}
        callType={callType}
        remoteUser={remoteProfile || otherUser || null}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={endCall}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-accent transition-colors md:hidden">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        )}
        {otherUser && <ChatAvatar user={otherUser} size="md" showStatus isOnline={isOtherOnline} />}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-foreground text-sm tracking-tight">{displayName}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {typingUsernames.length > 0 ? (
              <span className="text-primary font-medium">typing...</span>
            ) : isOtherOnline ? (
              <span className="text-online font-medium">Online</span>
            ) : (
              "Offline"
            )}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => otherUser && activeRoom && startCall(activeRoom.id, otherUser.id, "audio")}
            className="p-2.5 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            onClick={() => otherUser && activeRoom && startCall(activeRoom.id, otherUser.id, "video")}
            className="p-2.5 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <Video className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const isMine = msg.sender_id === user?.id;
                const showTime =
                  i === 0 ||
                  new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000;

                const senderProfile = profiles[msg.sender_id] || profile;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {showTime && (
                      <div className="text-center my-4">
                        <span className="text-[11px] text-muted-foreground bg-accent px-3 py-1 rounded-full font-medium">
                          {format(new Date(msg.created_at), "h:mm a")}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-0.5`}>
                      {!isMine && senderProfile && (
                        <div className="mr-2 self-end">
                          <ChatAvatar user={senderProfile} size="sm" showStatus isOnline={onlineUsers.has(msg.sender_id)} />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${
                          isMine
                            ? "bg-chat-sent text-chat-sent-foreground rounded-2xl rounded-br-sm"
                            : "bg-chat-received text-chat-received-foreground rounded-2xl rounded-bl-sm"
                        }`}
                      >
                        {msg.file_url && msg.file_name && msg.file_type && (
                          <div className="mb-2">
                            <FilePreview
                              fileUrl={msg.file_url}
                              fileName={msg.file_name}
                              fileType={msg.file_type}
                              isMine={isMine}
                            />
                          </div>
                        )}
                        {msg.content && (!msg.file_url || !msg.content.startsWith("Sent a file:")) && (
                          <p>{msg.content}</p>
                        )}
                        {isMine && (
                          <div className="flex justify-end mt-1">
                            {msg.status === "read" ? (
                              <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/70" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-primary-foreground/50" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {typingUsernames.length > 0 && (
              <TypingIndicator username={typingUsernames[0]} />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* File preview bar */}
      {selectedFile && (
        <div className="px-5 py-3 border-t border-border bg-accent/30 flex items-center gap-3">
          {filePreviewUrl ? (
            <img src={filePreviewUrl} alt="preview" className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Paperclip className="h-5 w-5 text-primary" />
            </div>
          )}
          <span className="text-sm text-foreground truncate flex-1">{selectedFile.name}</span>
          <button onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); }} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card relative">
        {showEmoji && (
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-2.5 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <Smile className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() && !selectedFile}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageArea;

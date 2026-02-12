import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Profile } from "@/types/chat";
import ChatAvatar from "./Avatar";

interface CallUIProps {
  callState: "idle" | "calling" | "incoming" | "connected";
  callType: "audio" | "video";
  remoteUser: Profile | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
}

const CallUI = ({ callState, callType, remoteUser, localStream, remoteStream, onAccept, onReject, onEnd }: CallUIProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (callState !== "connected") { setElapsed(0); return; }
    const i = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(i);
  }, [callState]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (callState === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground/95 flex flex-col items-center justify-center text-primary-foreground"
      >
        {/* Remote video (full screen) */}
        {callType === "video" && callState === "connected" && (
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* Local video (PIP) */}
        {callType === "video" && localStream && (
          <div className="absolute top-4 right-4 w-32 h-44 rounded-xl overflow-hidden shadow-2xl border-2 border-primary-foreground/20 z-10">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        )}

        {/* Call info overlay */}
        <div className="relative z-10 flex flex-col items-center">
          {(callState !== "connected" || callType === "audio") && remoteUser && (
            <>
              <motion.div
                animate={callState === "calling" || callState === "incoming" ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ChatAvatar user={remoteUser} size="lg" />
              </motion.div>
              <h2 className="text-xl font-semibold mt-4">{remoteUser.username}</h2>
            </>
          )}

          <p className="text-sm opacity-70 mt-1">
            {callState === "calling" && "Calling..."}
            {callState === "incoming" && "Incoming call..."}
            {callState === "connected" && formatTime(elapsed)}
          </p>
        </div>

        {/* Controls */}
        <div className="relative z-10 flex items-center gap-4 mt-12">
          {callState === "incoming" ? (
            <>
              <button onClick={onAccept} className="p-4 rounded-full bg-online text-primary-foreground shadow-lg hover:opacity-90 transition-opacity">
                <Phone className="h-6 w-6" />
              </button>
              <button onClick={onReject} className="p-4 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:opacity-90 transition-opacity">
                <PhoneOff className="h-6 w-6" />
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleMute} className={`p-3 rounded-full ${isMuted ? "bg-destructive" : "bg-primary-foreground/20"} transition-colors`}>
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              {callType === "video" && (
                <button onClick={toggleVideo} className={`p-3 rounded-full ${isVideoOff ? "bg-destructive" : "bg-primary-foreground/20"} transition-colors`}>
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </button>
              )}
              <button onClick={onEnd} className="p-4 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:opacity-90 transition-opacity">
                <PhoneOff className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallUI;

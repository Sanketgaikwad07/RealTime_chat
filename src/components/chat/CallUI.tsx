import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize, Minimize } from "lucide-react";
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Reset controls on new call
  useEffect(() => {
    if (callState === "idle") {
      setIsMuted(false);
      setIsVideoOff(false);
      setIsFullscreen(false);
    }
  }, [callState]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => (t.enabled = !t.enabled));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => (t.enabled = !t.enabled));
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not supported
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (callState === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground/95 flex flex-col items-center justify-center"
        style={{ color: "white" }}
      >
        {/* Remote video (full screen background) */}
        {callType === "video" && callState === "connected" && remoteStream && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Local video (PIP) */}
        {callType === "video" && localStream && !isVideoOff && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-10"
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: "scaleX(-1)" }}
            />
          </motion.div>
        )}

        {/* Gradient overlay for controls visibility */}
        {callType === "video" && callState === "connected" && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 z-[1]" />
        )}

        {/* Call info */}
        <div className="relative z-10 flex flex-col items-center">
          {(callState !== "connected" || callType === "audio") && remoteUser && (
            <>
              <motion.div
                animate={
                  callState === "calling" || callState === "incoming"
                    ? { scale: [1, 1.08, 1], opacity: [1, 0.8, 1] }
                    : {}
                }
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChatAvatar user={remoteUser} size="lg" />
              </motion.div>
              <h2 className="text-xl font-bold mt-4 drop-shadow-lg">{remoteUser.username}</h2>
            </>
          )}

          {callState === "connected" && callType === "audio" && remoteUser && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 rounded-full bg-green-400 mt-2 shadow-lg shadow-green-400/50"
            />
          )}

          <p className="text-sm mt-2 drop-shadow-md" style={{ opacity: 0.8 }}>
            {callState === "calling" && "Calling..."}
            {callState === "incoming" && `Incoming ${callType} call...`}
            {callState === "connected" && formatTime(elapsed)}
          </p>
        </div>

        {/* Controls */}
        <div className="relative z-10 flex items-center gap-3 sm:gap-4 mt-12">
          {callState === "incoming" ? (
            <>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onAccept}
                className="p-4 sm:p-5 rounded-full bg-green-500 shadow-lg shadow-green-500/30 hover:bg-green-400 transition-colors"
              >
                {callType === "video" ? (
                  <Video className="h-6 w-6 text-white" />
                ) : (
                  <Phone className="h-6 w-6 text-white" />
                )}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onReject}
                className="p-4 sm:p-5 rounded-full bg-red-500 shadow-lg shadow-red-500/30 hover:bg-red-400 transition-colors"
              >
                <PhoneOff className="h-6 w-6 text-white" />
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                className={`p-3 sm:p-4 rounded-full transition-colors ${
                  isMuted ? "bg-red-500/80" : "bg-white/20 hover:bg-white/30"
                }`}
              >
                {isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
              </motion.button>

              {callType === "video" && (
                <>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleVideo}
                    className={`p-3 sm:p-4 rounded-full transition-colors ${
                      isVideoOff ? "bg-red-500/80" : "bg-white/20 hover:bg-white/30"
                    }`}
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleFullscreen}
                    className="p-3 sm:p-4 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-5 w-5 text-white" />
                    ) : (
                      <Maximize className="h-5 w-5 text-white" />
                    )}
                  </motion.button>
                </>
              )}

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onEnd}
                className="p-4 sm:p-5 rounded-full bg-red-500 shadow-lg shadow-red-500/30 hover:bg-red-400 transition-colors"
              >
                <PhoneOff className="h-6 w-6 text-white" />
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallUI;

import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { CallSignal } from "@/types/chat";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const useWebRTC = () => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<"idle" | "calling" | "incoming" | "connected">("idle");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    localStream?.getTracks().forEach(t => t.stop());
    pc.current?.close();
    pc.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setRemoteUserId(null);
    setCurrentRoomId(null);
    pendingCandidates.current = [];
  }, [localStream]);

  const sendSignal = useCallback(async (roomId: string, calleeId: string, type: string, payload: any) => {
    if (!user) return;
    await supabase.from("call_signals").insert({
      room_id: roomId,
      caller_id: user.id,
      callee_id: calleeId,
      type,
      payload,
    });
  }, [user]);

  const createPeerConnection = useCallback((roomId: string, otherUserId: string) => {
    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    connection.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal(roomId, otherUserId, "ice-candidate", { candidate: e.candidate.toJSON() });
      }
    };

    const remote = new MediaStream();
    setRemoteStream(remote);
    connection.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach(t => remote.addTrack(t));
    };

    connection.oniceconnectionstatechange = () => {
      if (connection.iceConnectionState === "disconnected" || connection.iceConnectionState === "failed") {
        cleanup();
      }
    };

    pc.current = connection;
    return connection;
  }, [sendSignal, cleanup]);

  const startCall = useCallback(async (roomId: string, otherUserId: string, type: "audio" | "video") => {
    if (!user) return;
    try {
      setCallType(type);
      setCallState("calling");
      setRemoteUserId(otherUserId);
      setCurrentRoomId(roomId);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      setLocalStream(stream);

      const connection = createPeerConnection(roomId, otherUserId);
      stream.getTracks().forEach(t => connection.addTrack(t, stream));

      await sendSignal(roomId, otherUserId, "call-start", { callType: type });

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await sendSignal(roomId, otherUserId, "offer", { sdp: offer });
    } catch (err) {
      console.error("Failed to start call:", err);
      cleanup();
    }
  }, [user, createPeerConnection, sendSignal, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!currentRoomId || !remoteUserId || !user) return;
    try {
      setCallState("connected");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      setLocalStream(stream);

      const connection = createPeerConnection(currentRoomId, remoteUserId);
      stream.getTracks().forEach(t => connection.addTrack(t, stream));

      // Process pending candidates
      for (const c of pendingCandidates.current) {
        await connection.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidates.current = [];
    } catch (err) {
      console.error("Failed to accept call:", err);
      cleanup();
    }
  }, [currentRoomId, remoteUserId, user, callType, createPeerConnection, cleanup]);

  const rejectCall = useCallback(async () => {
    if (currentRoomId && remoteUserId) {
      await sendSignal(currentRoomId, remoteUserId, "call-reject", {});
    }
    cleanup();
  }, [currentRoomId, remoteUserId, sendSignal, cleanup]);

  const endCall = useCallback(async () => {
    if (currentRoomId && remoteUserId) {
      await sendSignal(currentRoomId, remoteUserId, "call-end", {});
    }
    cleanup();
  }, [currentRoomId, remoteUserId, sendSignal, cleanup]);

  // Listen for call signals
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("call-signals")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals" },
        async (payload) => {
          const signal = payload.new as CallSignal;
          if (signal.callee_id !== user.id) return;

          switch (signal.type) {
            case "call-start":
              setCallState("incoming");
              setCallType(signal.payload?.callType || "audio");
              setRemoteUserId(signal.caller_id);
              setCurrentRoomId(signal.room_id);
              break;

            case "offer":
              if (pc.current && signal.payload?.sdp) {
                await pc.current.setRemoteDescription(new RTCSessionDescription(signal.payload.sdp));
                const answer = await pc.current.createAnswer();
                await pc.current.setLocalDescription(answer);
                await sendSignal(signal.room_id, signal.caller_id, "answer", { sdp: answer });
                setCallState("connected");
              }
              break;

            case "answer":
              if (pc.current && signal.payload?.sdp) {
                await pc.current.setRemoteDescription(new RTCSessionDescription(signal.payload.sdp));
                setCallState("connected");
              }
              break;

            case "ice-candidate":
              if (signal.payload?.candidate) {
                if (pc.current?.remoteDescription) {
                  await pc.current.addIceCandidate(new RTCIceCandidate(signal.payload.candidate));
                } else {
                  pendingCandidates.current.push(signal.payload.candidate);
                }
              }
              break;

            case "call-end":
            case "call-reject":
              cleanup();
              break;
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, sendSignal, cleanup]);

  return {
    callState,
    callType,
    remoteUserId,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  };
};

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase, isSupabaseReady } from "@/lib/supabase";
import { WebRTCService, type ConnectionState, type NetworkQuality, type SignalMessage } from "@/lib/webrtc-service";

export interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: ConnectionState;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isScreenSharing: boolean;
  remoteVideoOn: boolean;
  remoteAudioOn: boolean;
  networkQuality: NetworkQuality;
  permissionError: string | null;
  isConnected: boolean;
}

interface Params {
  roomId: string;
  userId: string;
  partnerId: string;
  isInitiator: boolean;
  startWithVideo: boolean;
  startWithAudio: boolean;
}

export function useWebRTC({ roomId, userId, partnerId, isInitiator, startWithVideo, startWithAudio }: Params) {
  const svcRef = useRef<WebRTCService | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const signalReadyRef = useRef(false);
  const mountedRef = useRef(true);

  const [state, setState] = useState<WebRTCState>({
    localStream:      null,
    remoteStream:     null,
    connectionState:  "new",
    isVideoOn:        startWithVideo,
    isAudioOn:        startWithAudio,
    isScreenSharing:  false,
    remoteVideoOn:    true,
    remoteAudioOn:    true,
    networkQuality:   "unknown",
    permissionError:  null,
    isConnected:      false,
  });

  const patch = useCallback((partial: Partial<WebRTCState>) => {
    if (mountedRef.current) setState(prev => ({ ...prev, ...partial }));
  }, []);

  // ─── Broadcast helper ─────────────────────────────────────────────────────
  const broadcast = useCallback((payload: Omit<SignalMessage, "from">) => {
    channelRef.current?.send({ type: "broadcast", event: "signal", payload: { ...payload, from: userId } });
  }, [userId]);

  // ─── Setup Supabase Realtime signaling channel ────────────────────────────
  const setupChannel = useCallback((svc: WebRTCService) => {
    if (!isSupabaseReady()) return;

    const ch = supabase.channel(`webrtc:${roomId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = ch;

    svc.onIceCandidate = (candidate) => {
      if (signalReadyRef.current) broadcast({ type: "ice", candidate });
    };

    ch.on("broadcast", { event: "signal" }, async ({ payload }: any) => {
      if (!mountedRef.current || !svc) return;
      const msg = payload as SignalMessage;
      if (msg.from === userId) return; // ignore own messages

      if (msg.type === "offer") {
        const answer = await svc.handleOffer(msg.sdp);
        signalReadyRef.current = true;
        broadcast({ type: "answer", sdp: answer });
      } else if (msg.type === "answer") {
        await svc.handleAnswer(msg.sdp);
      } else if (msg.type === "ice") {
        await svc.addIceCandidate(msg.candidate);
      } else if (msg.type === "media_state") {
        patch({ remoteVideoOn: msg.video, remoteAudioOn: msg.audio });
      } else if (msg.type === "screen_share") {
        // remote screen share state for UI
      }
    });

    ch.subscribe(async (status: string) => {
      if (status !== "SUBSCRIBED" || !mountedRef.current) return;
      if (isInitiator) {
        // Wait 800ms so both peers are subscribed before sending offer
        await new Promise(r => setTimeout(r, 800));
        if (!mountedRef.current) return;
        const offer = await svc.createOffer();
        signalReadyRef.current = true;
        broadcast({ type: "offer", sdp: offer });
      }
    });
  }, [roomId, userId, isInitiator, broadcast, patch]);

  // ─── Start ────────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    const svc = new WebRTCService();
    svcRef.current = svc;

    svc.onRemoteStream = (stream) => patch({ remoteStream: stream });
    svc.onConnectionStateChange = (connectionState) =>
      patch({ connectionState, isConnected: connectionState === "connected" });

    (async () => {
      try {
        const stream = await svc.acquireMedia(startWithVideo, startWithAudio);
        if (!mountedRef.current) { svc.destroy(); return; }
        patch({ localStream: stream, permissionError: null });
        setupChannel(svc);
      } catch (e: any) {
        const msg =
          e?.name === "NotAllowedError" ? "Camera/microphone permission denied. Allow access in browser settings." :
          e?.name === "NotFoundError"   ? "No camera or microphone found on this device." :
          e?.name === "NotReadableError"? "Camera/mic is in use by another app. Close it and retry." :
          "Could not access camera/microphone.";
        patch({ permissionError: msg });
        // Still set up channel — audio-only or connection-only mode
        setupChannel(svc);
      }
    })();

    // Quality poll
    const qualityId = setInterval(() => {
      if (mountedRef.current && svcRef.current) {
        patch({ networkQuality: svcRef.current.getNetworkQuality() });
      }
    }, 4000);

    return () => {
      mountedRef.current = false;
      clearInterval(qualityId);
      svc.destroy();
      channelRef.current?.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Controls ────────────────────────────────────────────────────────────

  const toggleVideo = useCallback(() => {
    const next = !state.isVideoOn;
    svcRef.current?.setVideoEnabled(next);
    patch({ isVideoOn: next });
    broadcast({ type: "media_state", video: next, audio: state.isAudioOn });
  }, [state.isVideoOn, state.isAudioOn, broadcast, patch]);

  const toggleAudio = useCallback(() => {
    const next = !state.isAudioOn;
    svcRef.current?.setAudioEnabled(next);
    patch({ isAudioOn: next });
    broadcast({ type: "media_state", video: state.isVideoOn, audio: next });
  }, [state.isVideoOn, state.isAudioOn, broadcast, patch]);

  const switchCamera = useCallback(async () => {
    await svcRef.current?.switchCamera();
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (state.isScreenSharing) {
      await svcRef.current?.stopScreenShare();
      patch({ isScreenSharing: false });
      broadcast({ type: "screen_share", sharing: false });
    } else {
      try {
        const screenStream = await svcRef.current?.acquireScreenShare();
        if (screenStream) {
          await svcRef.current?.startScreenShare(screenStream);
          patch({ isScreenSharing: true });
          broadcast({ type: "screen_share", sharing: true });
          screenStream.getVideoTracks()[0].onended = () => {
            patch({ isScreenSharing: false });
            broadcast({ type: "screen_share", sharing: false });
          };
        }
      } catch {}
    }
  }, [state.isScreenSharing, broadcast, patch]);

  return {
    ...state,
    toggleVideo,
    toggleAudio,
    switchCamera,
    toggleScreenShare,
  };
}

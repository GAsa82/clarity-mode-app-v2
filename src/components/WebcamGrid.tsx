import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Mic, MicOff, Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react";
import { getAnonymousUsername } from "@/lib/focus-streak";
import { supabase, isSupabaseReady } from "@/lib/supabase";

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

type Peer = { id: string; name: string; stream: MediaStream | null };

interface Props {
  roomSlug: string;
}

export const WebcamGrid = ({ roomSlug }: Props) => {
  const [cameraOn, setCameraOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [blurBg, setBlurBg] = useState(false);
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [permError, setPermError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef(new Map<string, RTCPeerConnection>());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceBuf = useRef(new Map<string, RTCIceCandidateInit[]>());

  const userName = getAnonymousUsername();
  const myId = useRef(`${userName}_${Math.random().toString(36).slice(2, 8)}`).current;

  // ── WebRTC helpers ─────────────────────────────────────────────────────────

  const makePeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcsRef.current.set(peerId, pc);

    localStreamRef.current?.getTracks().forEach(t =>
      pc.addTrack(t, localStreamRef.current!)
    );

    pc.ontrack = ({ streams }) => {
      setPeers(prev =>
        prev.map(p => p.id === peerId ? { ...p, stream: streams[0] } : p)
      );
    };

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      channelRef.current?.send({
        type: "broadcast",
        event: "ice",
        payload: { from: myId, to: peerId, candidate },
      });
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "disconnected" || state === "failed" || state === "closed") {
        pc.close();
        pcsRef.current.delete(peerId);
        setPeers(prev => prev.filter(p => p.id !== peerId));
      }
    };

    return pc;
  }, [myId]);

  const offerTo = useCallback(async (peerId: string, peerName: string) => {
    if (pcsRef.current.has(peerId)) return;
    const pc = makePeerConnection(peerId);
    setPeers(prev => prev.some(p => p.id === peerId) ? prev : [...prev, { id: peerId, name: peerName, stream: null }]);
    try {
      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      channelRef.current?.send({
        type: "broadcast",
        event: "offer",
        payload: { from: myId, fromName: userName, to: peerId, sdp: offer },
      });
    } catch (err) {
      console.error("[WebRTC] offer failed:", err);
    }
  }, [makePeerConnection, myId, userName]);

  const setupChannel = useCallback((stream: MediaStream | null) => {
    if (!isSupabaseReady()) return;

    const ch = supabase.channel(`webcam:${roomSlug}`, {
      config: {
        broadcast: { self: false },
        presence: { key: myId },
      },
    });
    channelRef.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, { name: string }[]>;
      Object.entries(state).forEach(([pid, presences]) => {
        if (pid === myId || pcsRef.current.has(pid)) return;
        offerTo(pid, presences[0]?.name ?? "Anonymous");
      });
    });

    ch.on("presence", { event: "join" }, ({ key, newPresences }: any) => {
      if (key === myId || pcsRef.current.has(key)) return;
      if (myId < key) offerTo(key, newPresences[0]?.name ?? "Anonymous");
    });

    ch.on("presence", { event: "leave" }, ({ key }: any) => {
      pcsRef.current.get(key)?.close();
      pcsRef.current.delete(key);
      setPeers(prev => prev.filter(p => p.id !== key));
    });

    ch.on("broadcast", { event: "offer" }, async ({ payload }: any) => {
      if (payload.to !== myId) return;
      if (pcsRef.current.has(payload.from)) return;
      const pc = makePeerConnection(payload.from);
      setPeers(prev =>
        prev.some(p => p.id === payload.from)
          ? prev
          : [...prev, { id: payload.from, name: payload.fromName, stream: null }]
      );
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        for (const c of iceBuf.current.get(payload.from) ?? []) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceBuf.current.delete(payload.from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ch.send({
          type: "broadcast",
          event: "answer",
          payload: { from: myId, to: payload.from, sdp: answer },
        });
      } catch (err) {
        console.error("[WebRTC] answer failed:", err);
      }
    });

    ch.on("broadcast", { event: "answer" }, async ({ payload }: any) => {
      if (payload.to !== myId) return;
      const pc = pcsRef.current.get(payload.from);
      if (pc && pc.signalingState !== "stable") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)).catch(console.error);
      }
    });

    ch.on("broadcast", { event: "ice" }, async ({ payload }: any) => {
      if (payload.to !== myId) return;
      const pc = pcsRef.current.get(payload.from);
      if (pc?.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
      } else {
        const buf = iceBuf.current.get(payload.from) ?? [];
        buf.push(payload.candidate);
        iceBuf.current.set(payload.from, buf);
      }
    });

    ch.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ name: userName, cameraOn: !!stream });
      }
    });
  }, [roomSlug, myId, userName, makePeerConnection, offerTo]);

  // ── Camera controls ────────────────────────────────────────────────────────

  async function startCamera() {
    setPermError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      const isInsecure =
        window.location.protocol !== "https:" &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1";
      setPermError(
        isInsecure
          ? "Camera requires HTTPS. Open the site via https:// or use localhost."
          : "Your browser doesn't support camera access. Try Chrome or Firefox."
      );
      return;
    }

    let stream: MediaStream | null = null;
    let lastErr: any = null;

    const attempts: MediaStreamConstraints[] = [
      { video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 30 } }, audio: true },
      { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
      { video: true, audio: false },
    ];

    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err: any) {
        lastErr = err;
        if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") break;
      }
    }

    if (!stream) {
      const n = lastErr?.name ?? "";
      const msg =
        n === "NotAllowedError" || n === "PermissionDeniedError"
          ? "Camera permission denied — click the camera icon in your address bar and allow access."
          : n === "NotFoundError" || n === "DevicesNotFoundError"
          ? "No camera found on this device."
          : n === "NotReadableError" || n === "TrackStartError"
          ? "Camera is in use by another app — close it and try again."
          : n === "OverconstrainedError"
          ? "Camera doesn't support the requested settings — try a different browser."
          : "Camera unavailable — make sure no other app is using it, then try again.";
      setPermError(msg);
      return;
    }

    stream.getAudioTracks().forEach(t => { t.enabled = false; });
    localStreamRef.current = stream;
    setLocalStream(stream);   // React state — triggers re-render with stream available
    setCameraOn(true);
    setupChannel(stream);
  }

  function stopCamera() {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    pcsRef.current.forEach(pc => pc.close());
    pcsRef.current.clear();
    iceBuf.current.clear();
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    setPeers([]);
    setCameraOn(false);
    setMicOn(false);
    setPermError(null);
  }

  function toggleMic() {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    setMicOn(prev => !prev);
  }

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcsRef.current.forEach(pc => pc.close());
      channelRef.current?.unsubscribe();
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  type Tile = Peer & { isLocal: boolean };
  const localTile: Tile = { id: "local", name: `${userName} (you)`, stream: localStream, isLocal: true };
  const allTiles: Tile[] = cameraOn ? [localTile, ...peers.map(p => ({ ...p, isLocal: false }))] : [];
  const visibleTiles = fullscreenId ? allTiles.filter(t => t.id === fullscreenId) : allTiles;

  return (
    <div className="relative">
      {/* ── Controls ── */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={cameraOn ? stopCamera : startCamera}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            cameraOn
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-card-elevated border border-border hover:border-primary/30"
          }`}
        >
          {cameraOn ? <Camera className="w-3 h-3" /> : <CameraOff className="w-3 h-3 text-muted-foreground" />}
          <span className="text-[9px]">{cameraOn ? "Camera On" : "Camera"}</span>
        </button>

        {cameraOn && (
          <>
            <button
              type="button"
              onClick={toggleMic}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                micOn
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-card-elevated border border-border hover:border-primary/30"
              }`}
            >
              {micOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3 text-muted-foreground" />}
              <span className="text-[9px]">{micOn ? "Mic On" : "Mic Off"}</span>
            </button>

            <button
              type="button"
              onClick={() => setBlurBg(b => !b)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                blurBg
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-card-elevated border border-border hover:border-primary/30"
              }`}
            >
              {blurBg ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span className="text-[9px]">{blurBg ? "Blur On" : "Blur"}</span>
            </button>
          </>
        )}
      </div>

      {/* ── Permission error ── */}
      {permError && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">
          {permError}
        </div>
      )}

      {/* ── Video grid ── */}
      {cameraOn && (
        <div className={`grid gap-2 ${
          visibleTiles.length === 1 ? "grid-cols-1" :
          visibleTiles.length <= 4 ? "grid-cols-2" :
          "grid-cols-2 sm:grid-cols-3"
        }`}>
          <AnimatePresence>
            {visibleTiles.map(tile => (
              <motion.div
                key={tile.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
                className="relative rounded-2xl overflow-hidden bg-card-elevated border border-border group"
              >
                <div className={`relative ${fullscreenId ? "aspect-video" : "aspect-[4/3]"}`}>
                  {tile.isLocal && localStream ? (
                    <LocalVideo stream={localStream} blur={blurBg} />
                  ) : !tile.isLocal && tile.stream ? (
                    <RemoteVideo stream={tile.stream} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary gap-1.5">
                      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-semibold">
                        {tile.name.charAt(0).toUpperCase()}
                      </div>
                      {tile.isLocal ? (
                        <span className="text-[8px] text-muted-foreground/60">Camera starting...</span>
                      ) : (
                        <span className="text-[8px] text-muted-foreground/60 animate-pulse">Connecting...</span>
                      )}
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-white/90 truncate max-w-[80%]">{tile.name}</span>
                      <button
                        type="button"
                        onClick={() => setFullscreenId(fullscreenId ? null : tile.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        title={fullscreenId ? "Exit fullscreen" : "Fullscreen"}
                      >
                        {fullscreenId
                          ? <Minimize2 className="w-3 h-3 text-white/70" />
                          : <Maximize2 className="w-3 h-3 text-white/70" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {fullscreenId && (
        <button
          type="button"
          onClick={() => setFullscreenId(null)}
          className="mt-2 text-[9px] text-primary hover:underline flex items-center gap-1"
        >
          <Minimize2 className="w-3 h-3" />
          Show all participants
        </button>
      )}

      {!cameraOn && (
        <div className="text-center py-8">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-secondary flex items-center justify-center">
            <CameraOff className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground">Turn on camera to join the video grid.</p>
          <p className="text-[9px] text-muted-foreground/60 mt-1">
            Your video is shared peer-to-peer — only with others in this room.
          </p>
        </div>
      )}

      {cameraOn && peers.length === 0 && !permError && (
        <p className="text-center py-3 text-[10px] text-muted-foreground/60">
          Waiting for others to turn on their camera...
        </p>
      )}
    </div>
  );
};

// ── LocalVideo ─────────────────────────────────────────────────────────────────
// Mirrors RemoteVideo — separate stable component so srcObject is set once on mount
function LocalVideo({ stream, blur }: { stream: MediaStream; blur: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.muted = true;
    el.play().catch(() => {});
    return () => { el.srcObject = null; };
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className={`w-full h-full object-cover ${blur ? "blur-md" : ""}`}
    />
  );
}

// ── RemoteVideo ────────────────────────────────────────────────────────────────
function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.play().catch(() => {});
    return () => { el.srcObject = null; };
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      className="w-full h-full object-cover"
    />
  );
}

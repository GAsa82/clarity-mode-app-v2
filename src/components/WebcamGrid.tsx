import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Mic, MicOff, Maximize2, Minimize2, Eye, EyeOff } from "lucide-react";
import { getAnonymousUsername } from "@/lib/focus-streak";

type WebcamParticipant = {
  id: string;
  name: string;
  stream?: MediaStream;
  speaking: boolean;
  connectionQuality: "good" | "fair" | "poor";
  active: boolean;
};

const simulatedParticipants: WebcamParticipant[] = [
  { id: "sim-1", name: "FocusFox", speaking: false, connectionQuality: "good", active: true },
  { id: "sim-2", name: "ZenSeeker", speaking: false, connectionQuality: "fair", active: true },
  { id: "sim-3", name: "DeepDiver", speaking: false, connectionQuality: "good", active: true },
];

export const WebcamGrid = () => {
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [blurBg, setBlurBg] = useState(false);
  const [fullscreenParticipant, setFullscreenParticipant] = useState<string | null>(null);
  const [participants, setParticipants] = useState<WebcamParticipant[]>([...simulatedParticipants]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const userName = getAnonymousUsername();

  // Simulate speaking indicators
  useEffect(() => {
    if (!cameraOn) return;
    const interval = setInterval(() => {
      setParticipants(prev =>
        prev.map(p => ({
          ...p,
          speaking: Math.random() > 0.8,
          connectionQuality: (["good", "fair", "poor"] as const)[Math.floor(Math.random() * 3)],
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [cameraOn]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 },
        audio: false,
      });
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
      setParticipants(prev => [
        { id: "local", name: userName, stream, speaking: false, connectionQuality: "good", active: true },
        ...prev,
      ]);
    } catch (err) {
      console.warn("Camera access denied:", err);
      // Add fake local participant
      setParticipants(prev => [
        { id: "local", name: userName, speaking: false, connectionQuality: "good", active: true },
        ...prev,
      ]);
      setCameraOn(true);
    }
  }, [userName]);

  const stopCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setCameraOn(false);
    setParticipants(prev => prev.filter(p => p.id !== "local"));
  }, []);

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micOn;
      }
    }
    setMicOn(!micOn);
  }, [micOn]);

  const getQualityColor = (q: string) => {
    switch (q) {
      case "good": return "bg-green-500";
      case "fair": return "bg-yellow-500";
      case "poor": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="relative">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={cameraOn ? stopCamera : startCamera}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            cameraOn ? "bg-primary/20 text-primary border border-primary/30" : "bg-card-elevated border border-border hover:border-primary/30"
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
                micOn ? "bg-primary/20 text-primary border border-primary/30" : "bg-card-elevated border border-border hover:border-primary/30"
              }`}
            >
              {micOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3 text-muted-foreground" />}
              <span className="text-[9px]">{micOn ? "Mic On" : "Mic Off"}</span>
            </button>
            <button
              type="button"
              onClick={() => setBlurBg(!blurBg)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                blurBg ? "bg-primary/20 text-primary border border-primary/30" : "bg-card-elevated border border-border hover:border-primary/30"
              }`}
            >
              {blurBg ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span className="text-[9px]">{blurBg ? "Blur On" : "Blur"}</span>
            </button>
          </>
        )}
      </div>

      {/* Camera grid */}
      <div className={`grid gap-2 ${fullscreenParticipant ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
        <AnimatePresence>
          {participants.filter(p => p.active).map((participant) => (
            <motion.div
              key={participant.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className={`relative rounded-2xl overflow-hidden bg-card-elevated border border-border group ${
                fullscreenParticipant === participant.id ? "col-span-full row-span-full" : ""
              }`}
            >
              {/* Video placeholder */}
              <div className={`relative ${fullscreenParticipant ? "aspect-video" : "aspect-[4/3]"}`}>
                {/* Local video */}
                {participant.id === "local" && localStreamRef.current && (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${blurBg ? "blur-md" : ""}`}
                  />
                )}

                {/* Placeholder for simulated or no-video */}
                {(!localStreamRef.current || participant.id !== "local") && (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}

                {/* Speaking indicator */}
                {participant.speaking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-2 left-2"
                  >
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  </motion.div>
                )}

                {/* Connection quality */}
                <div className="absolute top-2 right-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${getQualityColor(participant.connectionQuality)}`} />
                </div>

                {/* Username overlay */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-background/80 text-foreground backdrop-blur-sm">
                      {participant.name}
                    </span>
                    {!fullscreenParticipant && (
                      <button
                        type="button"
                        onClick={() => setFullscreenParticipant(participant.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-background/80"
                      >
                        <Maximize2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mic indicator */}
                {participant.id !== "local" && (
                  <div className="absolute bottom-2 right-2">
                    {Math.random() > 0.3 ? (
                      <MicOff className="w-2.5 h-2.5 text-muted-foreground/60" />
                    ) : null}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {fullscreenParticipant && (
        <button
          type="button"
          onClick={() => setFullscreenParticipant(null)}
          className="mt-2 text-[9px] text-primary hover:underline"
        >
          <Minimize2 className="w-3 h-3 inline mr-1" />
          Exit fullscreen view
        </button>
      )}

      {/* Empty state */}
      {!cameraOn && (
        <div className="text-center py-8">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-secondary flex items-center justify-center">
            <CameraOff className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground">Turn on camera to see other focusers.</p>
          <p className="text-[9px] text-muted-foreground/60 mt-1">Mic is off by default. Audio-free focus mode.</p>
        </div>
      )}

      {cameraOn && participants.length === 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          Waiting for other focusers to join...
        </div>
      )}
    </div>
  );
};
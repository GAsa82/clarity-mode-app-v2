import { useEffect, useRef } from "react";
import { MicOff, VideoOff } from "lucide-react";

interface Props {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  videoOn: boolean;
  audioOn: boolean;
  isScreenSharing?: boolean;
  className?: string;
}

export function VideoTile({ stream, name, isLocal, videoOn, audioOn, isScreenSharing, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
    return () => { el.srcObject = null; };
  }, [stream]);

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-secondary border border-border ${className}`}>
      {/* Video */}
      {stream && videoOn ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-secondary to-background">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
          {!videoOn && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <VideoOff className="w-3 h-3" />
              {isLocal ? "Camera off" : `${name} camera off`}
            </div>
          )}
          {!stream && (
            <p className="text-[10px] text-muted-foreground animate-pulse">Connecting…</p>
          )}
        </div>
      )}

      {/* Screen share badge */}
      {isScreenSharing && (
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-blue-500/80 text-[9px] text-white font-medium">
          Sharing screen
        </div>
      )}

      {/* Name bar */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
        <span className="text-[11px] text-white/90 font-medium truncate max-w-[70%]">
          {name}{isLocal && " (you)"}
        </span>
        <div className="flex items-center gap-1">
          {!audioOn && <MicOff className="w-3 h-3 text-red-400" />}
          {!videoOn && <VideoOff className="w-3 h-3 text-red-400" />}
        </div>
      </div>
    </div>
  );
}

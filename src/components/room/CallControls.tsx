import { Video, VideoOff, Mic, MicOff, MonitorUp, MonitorX, FlipHorizontal, PhoneOff } from "lucide-react";
import { NetworkQualityIndicator } from "./NetworkQuality";
import type { NetworkQuality } from "@/lib/webrtc-service";

interface Props {
  isVideoOn: boolean;
  isAudioOn: boolean;
  isScreenSharing: boolean;
  networkQuality: NetworkQuality;
  isPremium: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onSwitchCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export function CallControls({
  isVideoOn, isAudioOn, isScreenSharing, networkQuality, isPremium,
  onToggleVideo, onToggleAudio, onSwitchCamera, onToggleScreenShare, onEndCall,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {/* Network quality indicator */}
      <div className="mr-2">
        <NetworkQualityIndicator quality={networkQuality} />
      </div>

      {/* Camera — premium only */}
      <ControlButton
        active={isVideoOn}
        disabled={!isPremium}
        activeIcon={<Video className="w-4 h-4" />}
        inactiveIcon={<VideoOff className="w-4 h-4" />}
        activeClass="bg-primary/20 text-primary border-primary/40"
        inactiveClass="bg-secondary text-muted-foreground border-border"
        disabledTitle={!isPremium ? "Video requires Premium" : undefined}
        onClick={onToggleVideo}
      />

      {/* Mic */}
      <ControlButton
        active={isAudioOn}
        activeIcon={<Mic className="w-4 h-4" />}
        inactiveIcon={<MicOff className="w-4 h-4" />}
        activeClass="bg-primary/20 text-primary border-primary/40"
        inactiveClass="bg-red-500/20 text-red-400 border-red-500/30"
        onClick={onToggleAudio}
      />

      {/* Switch camera — mobile */}
      {isPremium && isVideoOn && (
        <button
          onClick={onSwitchCamera}
          title="Switch camera"
          className="p-2.5 rounded-xl border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        >
          <FlipHorizontal className="w-4 h-4" />
        </button>
      )}

      {/* Screen share — premium only */}
      {isPremium && (
        <ControlButton
          active={isScreenSharing}
          activeIcon={<MonitorX className="w-4 h-4" />}
          inactiveIcon={<MonitorUp className="w-4 h-4" />}
          activeClass="bg-blue-500/20 text-blue-400 border-blue-500/30"
          inactiveClass="bg-secondary text-muted-foreground border-border"
          onClick={onToggleScreenShare}
        />
      )}

      {/* End call */}
      <button
        onClick={onEndCall}
        className="p-2.5 rounded-xl border border-red-500/40 bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
        title="End call"
      >
        <PhoneOff className="w-4 h-4" />
      </button>
    </div>
  );
}

function ControlButton({
  active, activeIcon, inactiveIcon, activeClass, inactiveClass, onClick, disabled, disabledTitle,
}: {
  active: boolean;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  activeClass: string;
  inactiveClass: string;
  onClick: () => void;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabledTitle}
      className={`p-2.5 rounded-xl border transition-all ${active ? activeClass : inactiveClass} ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-90"
      }`}
    >
      {active ? activeIcon : inactiveIcon}
    </button>
  );
}

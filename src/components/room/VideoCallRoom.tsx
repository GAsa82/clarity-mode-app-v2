import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, ShieldX, Maximize2, Minimize2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useSharedTimer } from "@/hooks/useSharedTimer";
import { VideoTile } from "./VideoTile";
import { CallControls } from "./CallControls";
import { SharedTimer } from "./SharedTimer";
import { SessionStats } from "./SessionStats";
import {
  joinPrivateRoom,
  leavePrivateRoom,
  createSession,
  endSession,
  reportUser,
  blockUser,
  type MatchType,
} from "@/lib/matching-service";
import { getAnonymousUsername } from "@/lib/focus-streak";

interface Props {
  roomId: string;
  userId: string;
  partnerId: string;
  isInitiator: boolean;
  matchType: MatchType;
  focusRoomSlug: string;
  isPremium: boolean;
  onEnd: () => void;
}

export function VideoCallRoom({
  roomId, userId, partnerId, isInitiator, matchType, focusRoomSlug, isPremium, onEnd,
}: Props) {
  const myName      = getAnonymousUsername();
  const partnerName = "Focus Partner";

  const [sessionId, setSessionId]         = useState<string | null>(null);
  const [startTime]                       = useState(() => Date.now());
  const [durationSeconds, setDuration]    = useState(0);
  const [fullscreen, setFullscreen]       = useState(false);
  const [showStats, setShowStats]         = useState(true);
  const [showReport, setShowReport]       = useState(false);
  const [reportReason, setReportReason]   = useState("harassment");
  const [reportNotes, setReportNotes]     = useState("");
  const [reportSent, setReportSent]       = useState(false);
  const [partnerLeft, setPartnerLeft]     = useState(false);
  const hasEnded = useRef(false);

  const webrtc = useWebRTC({
    roomId,
    userId,
    partnerId,
    isInitiator,
    startWithVideo: isPremium,
    startWithAudio: true,
  });

  const { timer, startTimer, pauseTimer, resetTimer } = useSharedTimer(roomId, userId, isInitiator);

  // ─── Session lifecycle ────────────────────────────────────────────────────

  useEffect(() => {
    // Join room + create session record
    (async () => {
      await joinPrivateRoom(roomId, userId);
      try {
        const sid = await createSession({ roomId, userId, partnerId, matchType, focusRoomSlug });
        setSessionId(sid);
      } catch {}
    })();

    return () => {
      if (!hasEnded.current) finishSession();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Duration ticker
  useEffect(() => {
    const id = setInterval(() => setDuration(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  // Detect partner disconnect
  useEffect(() => {
    if (webrtc.connectionState === "disconnected" || webrtc.connectionState === "failed") {
      setPartnerLeft(true);
    }
    if (webrtc.connectionState === "connected") setPartnerLeft(false);
  }, [webrtc.connectionState]);

  const finishSession = useCallback(async () => {
    if (hasEnded.current) return;
    hasEnded.current = true;
    await leavePrivateRoom(roomId, userId);
    if (sessionId) {
      await endSession(
        sessionId,
        Math.floor(durationSeconds / 60),
        timer.completedPomodoros,
      );
    }
  }, [roomId, userId, sessionId, durationSeconds, timer.completedPomodoros]);

  const handleEndCall = useCallback(async () => {
    await finishSession();
    onEnd();
  }, [finishSession, onEnd]);

  const handleReport = useCallback(async () => {
    await reportUser({ reporterId: userId, reportedId: partnerId, roomId, reason: reportReason, notes: reportNotes });
    setReportSent(true);
    setTimeout(handleEndCall, 1500);
  }, [userId, partnerId, roomId, reportReason, reportNotes, handleEndCall]);

  const handleBlock = useCallback(async () => {
    await blockUser(userId, partnerId);
    await finishSession();
    onEnd();
  }, [userId, partnerId, finishSession, onEnd]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 bg-black/95 flex flex-col ${fullscreen ? "" : "sm:inset-6 sm:rounded-3xl sm:overflow-hidden"}`}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${webrtc.isConnected ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
            <span className="text-[11px] text-white/60 capitalize">{webrtc.isConnected ? "Connected" : webrtc.connectionState}</span>
          </div>
          <SessionStats
            durationSeconds={durationSeconds}
            completedPomodoros={timer.completedPomodoros}
            totalFocusMinutes={timer.totalFocusMinutes}
            matchType={matchType}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReport(r => !r)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
            title="Report or block"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setFullscreen(f => !f)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
            title="Fullscreen"
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Video grid ──────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Primary video (remote) */}
        <VideoTile
          stream={webrtc.remoteStream}
          name={partnerName}
          videoOn={webrtc.remoteVideoOn && isPremium}
          audioOn={webrtc.remoteAudioOn}
          className="absolute inset-0 w-full h-full rounded-none"
        />

        {/* PiP local video (bottom right) */}
        {isPremium && (
          <div className="absolute bottom-4 right-4 w-32 h-24 sm:w-40 sm:h-28 shadow-2xl z-10">
            <VideoTile
              stream={webrtc.localStream}
              name={myName}
              isLocal
              videoOn={webrtc.isVideoOn}
              audioOn={webrtc.isAudioOn}
              isScreenSharing={webrtc.isScreenSharing}
              className="w-full h-full"
            />
          </div>
        )}

        {/* Voice-only mode: show both tiles side by side */}
        {!isPremium && (
          <div className="absolute inset-0 grid grid-cols-2 gap-3 p-4">
            <VideoTile
              stream={webrtc.localStream}
              name={myName}
              isLocal
              videoOn={false}
              audioOn={webrtc.isAudioOn}
              className="w-full h-full"
            />
            <VideoTile
              stream={webrtc.remoteStream}
              name={partnerName}
              videoOn={false}
              audioOn={webrtc.remoteAudioOn}
              className="w-full h-full"
            />
          </div>
        )}

        {/* Partner left banner */}
        <AnimatePresence>
          {partnerLeft && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs text-center z-20"
            >
              Partner connection lost — waiting to reconnect…
            </motion.div>
          )}
        </AnimatePresence>

        {/* Permission error */}
        {webrtc.permissionError && (
          <div className="absolute top-14 left-4 right-4 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs z-20">
            {webrtc.permissionError}
          </div>
        )}
      </div>

      {/* ── Bottom controls ──────────────────────────────────────────────── */}
      <div className="shrink-0 bg-black/60 border-t border-white/10 px-4 py-3 space-y-3">
        {/* Shared timer (collapsible) */}
        <button
          onClick={() => setShowStats(s => !s)}
          className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors mx-auto"
        >
          <MessageSquare className="w-3 h-3" />
          Shared timer
          {showStats ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <SharedTimer timer={timer} onStart={startTimer} onPause={pauseTimer} onReset={resetTimer} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Call controls */}
        <CallControls
          isVideoOn={webrtc.isVideoOn}
          isAudioOn={webrtc.isAudioOn}
          isScreenSharing={webrtc.isScreenSharing}
          networkQuality={webrtc.networkQuality}
          isPremium={isPremium}
          onToggleVideo={webrtc.toggleVideo}
          onToggleAudio={webrtc.toggleAudio}
          onSwitchCamera={webrtc.switchCamera}
          onToggleScreenShare={webrtc.toggleScreenShare}
          onEndCall={handleEndCall}
        />

        {!isPremium && (
          <p className="text-center text-[10px] text-white/30">
            Voice only on Free plan · <span className="text-primary">Upgrade for video</span>
          </p>
        )}
      </div>

      {/* ── Report / Block sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-2xl p-5 z-30 space-y-4"
          >
            <h4 className="font-semibold text-sm">Report or Block</h4>

            {reportSent ? (
              <p className="text-sm text-green-400">Report submitted. Ending call…</p>
            ) : (
              <>
                <div className="space-y-2">
                  {["spam", "harassment", "inappropriate", "other"].map(r => (
                    <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio" name="reason" value={r}
                        checked={reportReason === r}
                        onChange={() => setReportReason(r)}
                        className="accent-primary"
                      />
                      <span className="capitalize">{r}</span>
                    </label>
                  ))}
                </div>
                <textarea
                  value={reportNotes}
                  onChange={e => setReportNotes(e.target.value)}
                  placeholder="Additional details (optional)"
                  className="w-full text-sm bg-secondary border border-border rounded-xl px-3 py-2 resize-none outline-none focus:border-primary"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowReport(false)} className="flex-1 py-2 text-sm rounded-xl border border-border hover:bg-secondary transition-all">
                    Cancel
                  </button>
                  <button onClick={handleReport} className="flex-1 py-2 text-sm rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all">
                    Report & End
                  </button>
                  <button
                    onClick={handleBlock}
                    className="p-2 rounded-xl border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-all"
                    title="Block user"
                  >
                    <ShieldX className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

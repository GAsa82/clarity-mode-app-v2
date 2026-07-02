import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Clock, Tag, LogOut, Play, Flame, Sparkles, Moon, Sun,
  Camera, UserPlus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FocusTimer } from "@/components/FocusTimer";
import { AmbientSoundSelector } from "@/components/AmbientSoundSelector";
import { BreakChat } from "@/components/BreakChat";
import { MotivationalPopup } from "@/components/MotivationalPopup";
import { WebcamGrid } from "@/components/WebcamGrid";
import { ActivityFeed } from "@/components/ActivityFeed";
import { RoomEnergy } from "@/components/RoomEnergy";
import { AchievementPanel } from "@/components/AchievementPanel";
import { MatchmakingScreen } from "@/components/matching/MatchmakingScreen";
import { WaitingScreen } from "@/components/matching/WaitingScreen";
import { VideoCallRoom } from "@/components/room/VideoCallRoom";
import { DeepWorkChallenge } from "@/components/deepwork/DeepWorkChallenge";
import { checkAndUnlockAchievements, type Achievement } from "@/lib/achievements";
import {
  getRoomBySlug, joinRoom, leaveRoom, isJoinedInRoom, focusRooms, getVisitedRoomCount, type FocusRoom,
} from "@/lib/focus-rooms";
import {
  getAnonymousUsername, getFocusStats, getFocusStreak, recordFocusSession, type FocusStats,
} from "@/lib/focus-streak";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseReady } from "@/lib/supabase";
import type { MatchType, GenderPreference } from "@/lib/matching-service";

// ─── Gradient map ────────────────────────────────────────────────────────────

const ambientGradients: Record<string, string> = {
  "study-with-strangers":  "from-blue-900/30 via-background to-slate-900/30",
  "silent-focus-room":     "from-slate-900/40 via-background to-indigo-900/20",
  "morning-pomodoro":      "from-amber-900/30 via-background to-orange-900/20",
  "body-double-session":   "from-teal-900/30 via-background to-emerald-900/20",
  "premium-deep-work-lab": "from-purple-900/40 via-background to-fuchsia-900/20",
  "creative-flow-zone":    "from-pink-900/30 via-background to-rose-900/20",
};
const deepFocusGradient = "from-black via-background to-slate-950";

// ─── Page ────────────────────────────────────────────────────────────────────

export const FocusRoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { isPremium, plan } = useSubscription();

  // Room state
  const [room, setRoom]               = useState<FocusRoom | undefined>(undefined);
  const [joined, setJoined]           = useState(false);
  const [loading, setLoading]         = useState(true);
  const [fullscreen, setFullscreen]   = useState(false);
  const [deepFocus, setDeepFocus]     = useState(false);
  const [showCamera, setShowCamera]   = useState(false);
  const [timeSpent, setTimeSpent]     = useState(0);
  const [sessionStatus, setSessionStatus] = useState<string>("Ready to focus");
  const [stats, setStats]             = useState<FocusStats>(getFocusStats());
  const [streak, setStreak]           = useState(getFocusStreak());
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPhase, setTimerPhase]   = useState<"focus" | "break">("focus");
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [completedSessions, setCompletedSessions] = useState(0);
  const userName = getAnonymousUsername();

  // 1-on-1 matching state
  const [show1on1Panel, setShow1on1Panel] = useState(false);
  const [activeMatchType, setActiveMatchType] = useState<MatchType>("study");

  const planTier = (plan === "annual" ? "vip" : plan === "premium" ? "premium" : "free") as any;
  const userId   = user?.id ?? "";

  const matching = useMatchmaking({
    userId,
    focusRoomSlug: slug ?? "",
    planTier,
  });

  // ─── Room init ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!slug) return;
    const found = getRoomBySlug(slug);
    setRoom(found);
    if (found) setJoined(isJoinedInRoom(slug));
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, [slug]);

  useEffect(() => {
    if (!joined) return;
    const id = setInterval(() => setTimeSpent(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [joined]);

  // Premium members can enter locked (premium-only) rooms.
  const canJoin = !!room && (!room.locked || isPremium);

  const handleJoin = useCallback(() => {
    if (!slug || !room || (room.locked && !isPremium)) return;
    const updated = joinRoom(slug, isPremium);
    if (updated) { setRoom({ ...updated }); setJoined(true); setSessionStatus("Focus session started"); }
  }, [slug, room, isPremium]);

  const handleLeave = useCallback(() => {
    if (!slug) return;
    matching.cancelSearch();
    const updated = leaveRoom(slug);
    if (updated) {
      setRoom({ ...updated });
      setJoined(false);
      setTimeSpent(0);
      setSessionStatus("Left the room");
      setTimerRunning(false);
      setShowCamera(false);
      setShow1on1Panel(false);
    }
  }, [slug, matching]);

  const handleSessionComplete = useCallback((type: "focus" | "break", minutes: number) => {
    if (type === "focus") {
      setSessionStatus("Focus complete! Take a break.");
      const newStats = recordFocusSession(minutes, room?.name || "Focus Room");
      setStats(newStats);
      setStreak(getFocusStreak());
      const newSessions = completedSessions + 1;
      setCompletedSessions(newSessions);
      const unlocked = checkAndUnlockAchievements(
        newStats.totalSessions, newStats.totalMinutes, getFocusStreak(), getVisitedRoomCount(), minutes
      );
      if (unlocked.length > 0) setNewAchievement(unlocked[0]);
    } else {
      setSessionStatus("Break over. Let's focus.");
    }
  }, [room, completedSessions]);

  const handlePhaseChange = useCallback((phase: "focus" | "break") => {
    setTimerPhase(phase);
    setSessionStatus(phase === "focus" ? "Focus session started" : "Break time");
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // ─── 1-on-1 handlers ─────────────────────────────────────────────────────

  const handleStartSearch = useCallback((params: {
    matchType: MatchType;
    genderPreference: GenderPreference;
    interestTags: string[];
  }) => {
    setActiveMatchType(params.matchType);
    matching.startSearching(params);
  }, [matching]);

  const handleCallEnd = useCallback(() => {
    matching.reset();
    setShow1on1Panel(false);
  }, [matching]);

  // Open the panel if match found
  useEffect(() => {
    if (matching.phase === "matched") setShow1on1Panel(true);
  }, [matching.phase]);

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Clock className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
          <p className="font-display text-xl text-gradient">Entering focus room...</p>
          <p className="text-xs text-muted-foreground mt-2">Preparing your environment</p>
        </motion.div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <p className="font-display text-3xl font-light text-gradient mb-4">Room not found</p>
          <p className="text-sm text-muted-foreground mb-6">This focus room doesn't exist or may have been removed.</p>
          <Button variant="hero" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4 mr-2" />Back to home</Button>
        </div>
      </div>
    );
  }

  const gradient = deepFocus ? deepFocusGradient : (ambientGradients[room.slug] || "from-primary/10 via-background to-primary/5");

  // ─── Full-screen video call overlay ──────────────────────────────────────
  if (matching.phase === "matched" && matching.matchResult) {
    return (
      <AnimatePresence>
        <VideoCallRoom
          key={matching.matchResult.roomId}
          roomId={matching.matchResult.roomId}
          userId={userId}
          partnerId={matching.matchResult.partnerId}
          isInitiator={matching.matchResult.isInitiator}
          matchType={activeMatchType}
          focusRoomSlug={slug ?? ""}
          isPremium={isPremium}
          onEnd={handleCallEnd}
        />
      </AnimatePresence>
    );
  }

  // ─── Main page ────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen bg-background relative overflow-hidden transition-all duration-700 ${fullscreen ? "fixed inset-0 z-50" : ""} ${deepFocus ? "brightness-[0.7]" : ""}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(215_90%_62%/0.05),transparent_60%)] pointer-events-none" />

      {/* Particles */}
      {joined && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/20"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ y: [0, -30, 0], opacity: [0, 0.5, 0] }}
              transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="container flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
              </button>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-xl">{room.emoji}</span>
                <h1 className="font-display text-base font-medium truncate max-w-[200px]">{room.name}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {joined && <span className="text-[9px] text-muted-foreground hidden sm:block">@{userName}</span>}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass">
                <Users className="w-3 h-3 text-primary" />
                <span className="text-xs tabular-nums text-foreground">{room.active}</span>
              </div>

              {joined && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCamera(!showCamera)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-xl transition-all ${
                      showCamera ? "bg-primary/20 text-primary border border-primary/30" : "bg-card-elevated border border-border hover:border-primary/30"
                    }`}
                  >
                    <Camera className="w-3 h-3" />
                    <span className="text-[9px] hidden sm:inline">Camera</span>
                  </button>

                  {/* 1-on-1 button */}
                  <button
                    type="button"
                    onClick={() => { matching.reset(); setShow1on1Panel(p => !p); }}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-xl transition-all ${
                      show1on1Panel ? "bg-primary/20 text-primary border border-primary/30" : "bg-card-elevated border border-border hover:border-primary/30"
                    }`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span className="text-[9px] hidden sm:inline">1-on-1</span>
                  </button>

                  <AmbientSoundSelector />
                  <BreakChat />
                  <button type="button" onClick={() => setDeepFocus(!deepFocus)} className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-card-elevated border border-border hover:border-primary/30 transition-all">
                    {deepFocus ? <Moon className="w-3 h-3 text-primary" /> : <Sun className="w-3 h-3 text-muted-foreground" />}
                    <span className="text-[9px] text-muted-foreground hidden sm:inline">{deepFocus ? "Deep" : "Ambient"}</span>
                  </button>
                  <button type="button" onClick={() => setFullscreen(!fullscreen)} className="text-[10px] px-3 py-1.5 rounded-full glass text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                    {fullscreen ? "Exit FS" : "Fullscreen"}
                  </button>
                </>
              )}

              {joined ? (
                <Button variant="glass" size="sm" onClick={handleLeave}><LogOut className="w-3 h-3 mr-1.5" />Leave</Button>
              ) : (
                <Button variant="hero" size="sm" onClick={handleJoin} disabled={!canJoin}>
                  {!canJoin ? <><Sparkles className="w-3 h-3 mr-1.5" />Premium only</> : <><Play className="w-3 h-3 mr-1.5" />Join room</>}
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="container px-4 py-8">
          {!joined ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-card-elevated border border-border flex items-center justify-center text-4xl">{room.emoji}</div>
              <h2 className="font-display text-3xl md:text-4xl font-light leading-tight mb-4">{room.name}</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">{room.description}</p>
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {room.tags.map(tag => (<span key={tag} className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground"><Tag className="w-3 h-3" />{tag}</span>))}
                <span className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground"><Users className="w-3 h-3" />{room.active} focusers</span>
              </div>
              <Button variant="hero" size="lg" onClick={handleJoin} disabled={!canJoin}>
                {!canJoin ? <><Sparkles className="w-4 h-4 mr-2" />Unlock with Premium</> : <><Play className="w-4 h-4 mr-2" />Join Focus Room</>}
              </Button>
              <div className="mt-10">
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Timer modes available</p>
                <div className="flex justify-center gap-3">
                  {room.timerModes.map(m => (<span key={m.label} className="text-xs px-4 py-2 rounded-full bg-card-elevated border border-border text-muted-foreground">{m.focus}min focus / {m.break}min break</span>))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start max-w-6xl mx-auto">

              {/* Main column */}
              <div className="space-y-6">
                {/* Timer */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="rounded-3xl bg-card-elevated border border-border p-8 md:p-12 text-center relative overflow-hidden">
                  <motion.div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(215_90%_62%/0.08),transparent_60%)] pointer-events-none" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity }} />
                  <p className="text-[10px] uppercase tracking-[0.25em] text-primary mb-2">{sessionStatus}</p>
                  <p className="text-xs text-muted-foreground mb-8">{room.emoji} {room.name}</p>
                  <div className="mb-4">
                    <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" />{streak} day streak</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3 text-primary" />{room.active} focusers</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(timeSpent)}</span>
                    </div>
                  </div>
                  <FocusTimer modes={room.timerModes} onSessionComplete={handleSessionComplete} onPhaseChange={handlePhaseChange} onRunningChange={setTimerRunning} />
                </motion.div>

                {/* Verified Deep Work Challenge — Premium Deep Work Lab only */}
                {room.slug === "premium-deep-work-lab" && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}>
                    <DeepWorkChallenge
                      roomSlug={room.slug}
                      roomName={room.name}
                      onRewardEarned={(s) => { setStats(s); setStreak(getFocusStreak()); }}
                    />
                  </motion.div>
                )}

                {/* Webcam grid */}
                {showCamera && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-2xl bg-card-elevated border border-border p-4">
                    <WebcamGrid roomSlug={room.slug} />
                  </motion.div>
                )}

                {/* ── 1-on-1 Panel ────────────────────────────────────────── */}
                <AnimatePresence>
                  {show1on1Panel && matching.phase !== "matched" && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-2xl bg-card-elevated border border-primary/20 p-5 relative"
                    >
                      {/* Close */}
                      <button
                        onClick={() => { setShow1on1Panel(false); matching.reset(); }}
                        className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Require sign-in */}
                      {!userId || !isSupabaseReady() ? (
                        <div className="text-center py-6">
                          <UserPlus className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium mb-1">Sign in to find a 1-on-1 partner</p>
                          <p className="text-xs text-muted-foreground mb-4">Create a free account to start matching.</p>
                          <Button variant="hero" size="sm" onClick={() => navigate("/login")}>Sign in</Button>
                        </div>
                      ) : matching.phase === "idle" || matching.phase === "error" ? (
                        <>
                          {matching.error && (
                            <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                              {matching.error}
                            </div>
                          )}
                          <MatchmakingScreen
                            focusRoomName={room.name}
                            isPremium={isPremium}
                            onStart={handleStartSearch}
                            onClose={() => setShow1on1Panel(false)}
                          />
                        </>
                      ) : matching.phase === "searching" ? (
                        <WaitingScreen
                          matchType={activeMatchType}
                          waitSeconds={matching.waitSeconds}
                          onCancel={matching.cancelSearch}
                        />
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sidebar */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="flex flex-col gap-4">
                {/* 1-on-1 quick start card */}
                {!show1on1Panel && (
                  <div className="rounded-2xl bg-card-elevated border border-primary/15 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                        <UserPlus className="w-3 h-3 text-primary" />
                        1-on-1 Session
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      Find a private partner for focused co-working via live video or voice call.
                    </p>
                    <Button
                      variant="hero"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => { matching.reset(); setShow1on1Panel(true); }}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Find Partner
                    </Button>
                    {!isPremium && (
                      <p className="text-[9px] text-muted-foreground/60 text-center mt-2">Free: voice • 3/day — Premium: video + unlimited</p>
                    )}
                  </div>
                )}

                <RoomEnergy activeUsers={room.active} completedSessions={completedSessions} />

                {/* Stats */}
                <div className="rounded-2xl bg-card-elevated border border-border p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />Your Focus Stats
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 rounded-xl bg-secondary/50">
                      <p className="font-display text-xl font-light text-gradient">{stats.todaySessions}</p>
                      <p className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground">Today</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-secondary/50">
                      <p className="font-display text-xl font-light text-gradient">{stats.todayMinutes}m</p>
                      <p className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground">Minutes</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-secondary/50">
                      <p className="font-display text-xl font-light text-gradient">{stats.totalSessions}</p>
                      <p className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-secondary/50">
                      <p className="font-display text-xl font-light text-orange-400">{streak}</p>
                      <p className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground">Streak</p>
                    </div>
                  </div>
                </div>

                <ActivityFeed />
                <AchievementPanel newAchievement={newAchievement} onDismiss={() => setNewAchievement(null)} />

                {/* Room details */}
                <div className="rounded-2xl bg-card-elevated border border-border p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Room Info</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Participants</span>
                      <div className="flex items-center gap-1.5"><Users className="w-3 h-3 text-primary" /><span className="text-xs font-medium">{room.active}</span></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Capacity</span>
                      <span className="text-xs font-medium">{room.capacity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Time in room</span>
                      <span className="text-xs tabular-nums font-medium">{formatTime(timeSpent)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Anonymous as</span>
                      <span className="text-[10px] font-medium text-primary">@{userName}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="rounded-2xl bg-card-elevated border border-border p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Focus Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {room.tags.map(tag => (<span key={tag} className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary">#{tag.toLowerCase().replace(/\s+/g, "")}</span>))}
                  </div>
                </div>

                <Button variant="glass" onClick={handleLeave} className="w-full"><LogOut className="w-3.5 h-3.5 mr-2" />Leave room</Button>
              </motion.div>
            </div>
          )}

          {/* Other rooms */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-16 max-w-6xl mx-auto">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Other focus rooms</p>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
              {focusRooms.filter(r => r.slug !== room.slug).map(r => (
                <button key={r.id} type="button" onClick={() => navigate(`/room/${r.slug}`)} className="shrink-0 flex items-center gap-3 rounded-2xl bg-card-elevated border border-border p-3 hover:border-primary/30 transition-all hover:-translate-y-0.5">
                  <span className="text-xl">{r.emoji}</span>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-medium truncate max-w-[120px]">{r.name}</p>
                    <p className="text-[9px] text-muted-foreground">{r.active} focusers</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </main>
      </div>

      <MotivationalPopup running={timerRunning} phase={timerPhase} />
    </div>
  );
};

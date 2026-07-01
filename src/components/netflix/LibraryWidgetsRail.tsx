import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Crown, ExternalLink, Headphones, Pause, Play, Sparkles, Star, TrendingUp, Upload, Check, X, AlertTriangle } from "lucide-react";
import type { ClaritySession } from "@/lib/clarity-content";
import {
  downscaleImage,
  submitFace,
  getApprovedFaces,
  flushQueuedFaceSubmissions,
  getQueuedFaceSubmissionCount,
  type FaceSubmission,
} from "@/lib/face-submissions";

const DEFAULT_TRACK = {
  title: "Stratus Deep Work",
  subtitle: "Ambient focus field",
  duration: "45:00",
  url: "/pricing",
};

const AFFILIATE_URL = "https://amzn.to/49piiUZ";

const affiliateProducts = [
  {
    name: "Atomic Habits",
    subtitle: "James Clear — Tiny Changes, Remarkable Results",
    price: "$16.99",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=120&h=120&fit=crop&auto=format",
    url: AFFILIATE_URL,
  },
  {
    name: "The 7 Habits of Highly Effective People",
    subtitle: "Stephen R. Covey — Powerful Lessons in Personal Change",
    price: "$14.99",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=120&h=120&fit=crop&auto=format",
    url: AFFILIATE_URL,
  },
  {
    name: "How to Win Friends & Influence People",
    subtitle: "Dale Carnegie — The Classic Guide to Interpersonal Skills",
    price: "$11.99",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1526243741027-444d633d7365?w=120&h=120&fit=crop&auto=format",
    url: AFFILIATE_URL,
  },
];

const rules = [
  "No explicit or sexual content",
  "No hateful or abusive images",
  "No spam or illegal content",
  "Keep submissions respectful",
];

type LibraryWidgetsRailProps = {
  trendingSessions: ClaritySession[];
  onSelect: (session: ClaritySession) => void;
};

const widgetVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export const LibraryWidgetsRail = ({ trendingSessions, onSelect }: LibraryWidgetsRailProps) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0.32);
  const [approved, setApproved] = useState<FaceSubmission[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [username, setUsername] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getApprovedFaces().then(setApproved);
    const refreshQueue = async () => {
      await flushQueuedFaceSubmissions().catch(() => {});
      setQueuedCount(getQueuedFaceSubmissionCount());
    };
    refreshQueue();
    const handleOnline = () => {
      refreshQueue();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProgress((p) => (p >= 0.98 ? 0.08 : p + 0.004));
    }, 400);
    return () => clearInterval(id);
  }, [playing]);

  const topTrending = trendingSessions.slice(0, 4);
  const totalSeconds = 45 * 60;
  const currentSeconds = Math.floor(progress * totalSeconds);
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const todayMember = approved.length > 0 ? approved[0] : null;
  const allMembers = approved;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setImageError(true); return; }
    setImageError(false);
    try {
      setImage(await downscaleImage(file));
    } catch {
      setImageError(true);
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setQueueStatus(null);
    if (!username.trim()) { setSubmitError("Please enter a username."); return; }
    if (!image) { setSubmitError("Please upload a profile picture."); return; }
    setSubmitting(true);
    try {
      const result = await submitFace(username, image);
      setSubmitted(true);
      if (result.queued) {
        setQueueStatus(
          "Your submission is saved locally and will retry automatically once connectivity returns."
        );
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Couldn't submit right now. Please try again."
      );
    } finally {
      setSubmitting(false);
      setQueuedCount(getQueuedFaceSubmissionCount());
    }
  };

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-28">
      {/* Trending Sessions */}
      <motion.div
        custom={0}
        variants={widgetVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="relative rounded-2xl glass border border-white/10 p-4 overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/20 blur-3xl pointer-events-none animate-glow-pulse" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">
              Trending Now
            </p>
          </div>
          <ul className="space-y-2">
            {topTrending.map((session, i) => (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => onSelect(session)}
                  className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-primary/10 transition-all group"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {session.title}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">{session.duration}</span>
                  </span>
                  {session.premium && (
                    <Sparkles className="w-3 h-3 text-primary/70 shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Mini audio player */}
      <motion.div
        custom={1}
        variants={widgetVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="relative rounded-2xl bg-card-elevated border border-border p-4 overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(215_90%_62%/0.2),transparent_70%)]"
          animate={{ opacity: playing ? [0.4, 0.7, 0.4] : 0.25 }}
          transition={{ duration: 2.5, repeat: playing ? Infinity : 0 }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Headphones className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Now Playing
            </p>
          </div>
          <p className="text-sm font-medium text-foreground truncate">{DEFAULT_TRACK.title}</p>
          <p className="text-[10px] text-muted-foreground mb-3">{DEFAULT_TRACK.subtitle}</p>
          <div className="h-1 rounded-full bg-secondary overflow-hidden mb-3">
            <motion.div
              className="h-full rounded-full bg-primary-gradient shadow-glow"
              style={{ width: `${progress * 100}%` }}
              layout
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {formatTime(currentSeconds)} / {DEFAULT_TRACK.duration}
            </span>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setPlaying((p) => !p)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-gradient text-primary-foreground shadow-glow"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Member of the Day */}
      <motion.div
        custom={2}
        variants={widgetVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="relative rounded-2xl bg-card-elevated border border-border overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(215_90%_30%/0.15),transparent_60%)] pointer-events-none" />
        <div className="relative p-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass mb-4">
            <Star className="w-2.5 h-2.5 text-primary fill-primary" />
            <span className="text-[9px] uppercase tracking-[0.2em] text-primary font-medium">
              Member of the Day
            </span>
          </div>
          {todayMember ? (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/40 ring-offset-2 ring-offset-background mb-3">
                <img src={todayMember.image} alt={todayMember.username} className="w-full h-full object-cover" />
              </div>
              <p className="font-display text-lg font-light text-gradient">@{todayMember.username}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Featured today</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-3">
                <Crown className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="font-display text-sm font-light text-muted-foreground">No member featured yet</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Upload below.</p>
            </div>
          )}

          {/* Upload inline */}
          {showUpload ? (
            <div className="mt-4 pt-3 border-t border-border/60">
              {submitted ? (
                <div className="text-center py-2">
                  <Check className="w-6 h-6 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">
                    {queueStatus ?? "Submission received! Under review."}
                  </p>
                  {queuedCount > 0 && !queueStatus ? (
                    <p className="text-[8px] text-muted-foreground/70 mt-1">
                      {queuedCount} pending submission(s) remain in the offline retry queue.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => { setShowUpload(false); setSubmitted(false); setUsername(""); setImage(null); }}
                    className="text-[9px] text-primary mt-1 underline"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="w-20 h-20 rounded-full bg-secondary border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden cursor-pointer mx-auto mb-3 flex items-center justify-center"
                    onClick={() => fileRef.current?.click()}
                  >
                    {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-muted-foreground/50" />}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    maxLength={30}
                    className="w-full px-3 py-1.5 rounded-full bg-background/60 border border-border focus:border-primary outline-none text-[11px] transition-colors mb-2 text-center"
                  />
                  <div className="flex gap-1.5 justify-center">
                    <button
                      type="button"
                      onClick={() => { setShowUpload(false); setImage(null); setUsername(""); }}
                      className="text-[9px] px-2 py-1 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="text-[9px] px-2 py-1 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {submitting ? "Submitting…" : "Submit"}
                    </button>
                  </div>
                  {submitError && <p className="text-[9px] text-destructive mt-1">{submitError}</p>}
                  <button
                    type="button"
                    onClick={() => setShowRules(!showRules)}
                    className="text-[8px] text-muted-foreground/60 mt-2 underline"
                  >
                    {showRules ? "Hide rules" : "Community rules"}
                  </button>
                  {showRules && (
                    <div className="mt-2 rounded-lg border border-border bg-background/40 p-2">
                      <p className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Rules</p>
                      <ul className="space-y-0.5">
                        {rules.map((rule, i) => (
                          <li key={i} className="text-[8px] text-muted-foreground flex items-start gap-1">
                            <span className="text-primary">•</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[7px] text-muted-foreground/60 mt-1">Admin Approval Required.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="mt-3 text-[9px] text-primary hover:underline flex items-center gap-1 justify-center"
            >
              <Upload className="w-2.5 h-2.5" />
              Become the face of Clarity
            </button>
          )}
        </div>
      </motion.div>

      {/* Clarity Members */}
      <motion.div
        custom={3}
        variants={widgetVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="relative rounded-2xl bg-card-elevated border border-border p-4 overflow-hidden"
      >
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">
              Clarity Members
            </p>
          </div>
          <div className="space-y-2">
            {allMembers.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/70 py-1">
                No members featured yet.
              </p>
            ) : (
              allMembers.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-primary/10 transition-colors group">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/10 shrink-0">
                    <img src={m.image} alt={m.username} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      @{m.username}
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate">
                      Clarity Member
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* Recommended Gear */}
      <motion.div
        custom={4}
        variants={widgetVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="relative rounded-2xl bg-card-elevated border border-border p-4 overflow-hidden"
      >
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">
              Recommended Gear
            </p>
          </div>
          <div className="space-y-3">
            {affiliateProducts.map((product) => (
              <a
                key={product.name}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-primary/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary shrink-0 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {product.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{product.subtitle}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                    <span className="text-[10px] text-muted-foreground">{product.rating}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{product.price}</span>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
          <p className="mt-3 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 text-center">
            As an Amazon Associate we earn from qualifying purchases.
          </p>
        </div>
      </motion.div>
    </aside>
  );
};
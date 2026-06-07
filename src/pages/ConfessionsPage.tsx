import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, ChevronDown, ChevronUp, Send, Lock, Flame, Heart, Users, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All","Career","Relationships","Family","Mental Wellness","Business","Money","Education","Personal Growth","Other"];
const POST_CATEGORIES = CATEGORIES.filter(c => c !== "All");

const SORTS = [
  { key: "recent",    label: "Recent",          icon: "🕐" },
  { key: "trending",  label: "Trending",         icon: "🔥" },
  { key: "supported", label: "Most Supported",   icon: "🤝" },
  { key: "relatable", label: "Most Relatable",   icon: "❤️" },
  { key: "success",   label: "Success Stories",  icon: "⭐" },
];

const REACTIONS = [
  { key: "relate",  emoji: "❤️", label: "I Relate",       col: "react_relate"  },
  { key: "support", emoji: "🤝", label: "Support",         col: "react_support" },
  { key: "advice",  emoji: "💡", label: "Helpful Advice",  col: "react_advice"  },
  { key: "strong",  emoji: "🙏", label: "Stay Strong",     col: "react_strong"  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Career: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Relationships: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  Family: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Mental Wellness": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Business: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Money: "bg-green-500/15 text-green-400 border-green-500/30",
  Education: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  "Personal Growth": "bg-teal-500/15 text-teal-400 border-teal-500/30",
  Other: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

function getFingerprint(): string {
  const key = "cm_fp";
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    localStorage.setItem(key, fp);
  }
  return fp;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

interface Confession {
  id: string;
  anon_id: string;
  content: string;
  category: string;
  react_relate: number;
  react_support: number;
  react_advice: number;
  react_strong: number;
  reply_count: number;
  is_success: boolean;
  created_at: string;
}

interface Reply {
  id: string;
  anon_id: string;
  content: string;
  created_at: string;
}

const API = "/api/confessions";

export default function ConfessionsPage() {
  const [confessions, setConfessions]   = useState<Confession[]>([]);
  const [loading, setLoading]           = useState(true);
  const [category, setCategory]         = useState("All");
  const [sort, setSort]                 = useState("recent");
  const [postOpen, setPostOpen]         = useState(false);
  const [postText, setPostText]         = useState("");
  const [postCategory, setPostCategory] = useState("Career");
  const [posting, setPosting]           = useState(false);
  const [reactedIds, setReactedIds]     = useState<Set<string>>(new Set());
  const [replyOpen, setReplyOpen]       = useState<string | null>(null);
  const [replies, setReplies]           = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText]       = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replying, setReplying]         = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort]);

  async function fetchFeed() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category, sort, limit: "20" });
      const r = await fetch(`${API}/feed?${params}`);
      const d = await r.json();
      setConfessions(d.confessions || []);
    } catch {
      toast.error("Failed to load confessions. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    if (postText.trim().length < 10) {
      toast.error("Please write at least 10 characters.");
      return;
    }
    setPosting(true);
    try {
      const r = await fetch(`${API}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postText.trim(), category: postCategory }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error || "Failed to post."); return; }
      toast.success("Your confession has been shared anonymously. 🤫");
      setPostText("");
      setPostOpen(false);
      // Prepend to feed if in "recent" sort
      if (sort === "recent" || category === "All" || category === postCategory) {
        setConfessions(prev => [d.confession, ...prev]);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function handleReact(confessionId: string, reactionType: string) {
    const dedupeKey = `${confessionId}:${reactionType}`;
    if (reactedIds.has(dedupeKey)) {
      toast("You've already reacted!", { icon: "🤗" });
      return;
    }
    try {
      const r = await fetch(`${API}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId, reactionType, fingerprint: getFingerprint() }),
      });
      const d = await r.json();
      if (d.alreadyReacted) {
        toast("You've already reacted!", { icon: "🤗" });
        setReactedIds(prev => new Set([...prev, dedupeKey]));
        return;
      }
      if (d.success && d.counts) {
        setReactedIds(prev => new Set([...prev, dedupeKey]));
        setConfessions(prev => prev.map(c =>
          c.id === confessionId ? { ...c, ...d.counts } : c
        ));
      }
    } catch {
      toast.error("Reaction failed. Try again.");
    }
  }

  async function openReplies(confessionId: string) {
    if (replyOpen === confessionId) {
      setReplyOpen(null);
      return;
    }
    setReplyOpen(confessionId);
    if (replies[confessionId]) return;
    setReplyLoading(true);
    try {
      const r = await fetch(`${API}/replies?confessionId=${confessionId}`);
      const d = await r.json();
      setReplies(prev => ({ ...prev, [confessionId]: d.replies || [] }));
    } catch {
      toast.error("Failed to load replies.");
    } finally {
      setReplyLoading(false);
    }
  }

  async function handleReply(confessionId: string) {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      const r = await fetch(`${API}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId, content: replyText.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error || "Failed to reply."); return; }
      setReplies(prev => ({
        ...prev,
        [confessionId]: [...(prev[confessionId] || []), d.reply],
      }));
      setConfessions(prev => prev.map(c =>
        c.id === confessionId ? { ...c, reply_count: c.reply_count + 1 } : c
      ));
      setReplyText("");
      toast.success("Reply posted anonymously.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setReplying(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-12 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl" />
          <div className="absolute top-32 right-1/4 w-48 h-48 rounded-full bg-blue-600/10 blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-sm font-medium mb-6">
            <Lock className="w-3.5 h-3.5" />
            100% Anonymous — No account linked to your words
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 bg-gradient-to-br from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
            Secret Confessions
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            A safe space to share what you can't say out loud. No judgement. No identity.
            Just real people, real struggles, real support.
          </p>
          <Button
            onClick={() => { setPostOpen(true); setTimeout(() => textareaRef.current?.focus(), 100); }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 h-auto text-base font-semibold rounded-xl shadow-lg"
          >
            Share a Confession 🤫
          </Button>

          {/* Stats */}
          <div className="flex justify-center gap-8 mt-10 flex-wrap">
            {[
              { icon: <Lock className="w-4 h-4" />, label: "Your identity stays hidden" },
              { icon: <Users className="w-4 h-4" />, label: "Real community support" },
              { icon: <Heart className="w-4 h-4" />, label: "Moderated & safe" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-purple-400">{s.icon}</span>
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sort tabs */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {SORTS.map(s => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                sort === s.key
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                category === c
                  ? "bg-white text-gray-900 border-transparent"
                  : "bg-transparent text-muted-foreground border-border/50 hover:border-border"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-border/50 bg-card p-6 animate-pulse">
                <div className="h-3 bg-white/5 rounded w-1/4 mb-3" />
                <div className="h-4 bg-white/5 rounded w-full mb-2" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : confessions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-4">🤫</div>
            <p className="text-lg font-medium">No confessions here yet.</p>
            <p className="text-sm mt-1">Be the first to share something.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setPostOpen(true)}
            >
              Share a Confession
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {confessions.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-border/60 bg-card hover:border-purple-500/30 transition-colors p-5"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                        {c.anon_id?.replace("Anonymous User #", "").slice(-2)}
                      </div>
                      <span className="text-sm text-muted-foreground">{c.anon_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.is_success && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium flex items-center gap-1">
                          <Star className="w-3 h-3" /> Success
                        </span>
                      )}
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Other)}>
                        {c.category}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-sm leading-relaxed text-foreground/90 mb-4 whitespace-pre-wrap">{c.content}</p>

                  {/* Reactions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {REACTIONS.map(r => {
                      const count = c[r.col as keyof Confession] as number;
                      const reacted = reactedIds.has(`${c.id}:${r.key}`);
                      return (
                        <button
                          key={r.key}
                          onClick={() => handleReact(c.id, r.key)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                            reacted
                              ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
                              : "bg-white/5 border-border/50 text-muted-foreground hover:bg-white/10 hover:text-foreground hover:border-border"
                          )}
                        >
                          <span>{r.emoji}</span>
                          <span>{r.label}</span>
                          {count > 0 && <span className="ml-0.5 opacity-70">{count}</span>}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => openReplies(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all ml-auto"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {c.reply_count > 0 ? `${c.reply_count} replies` : "Reply"}
                      {replyOpen === c.id
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Replies section */}
                  <AnimatePresence>
                    {replyOpen === c.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-border/40">
                          {replyLoading ? (
                            <div className="space-y-2">
                              {[1, 2].map(i => (
                                <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
                              ))}
                            </div>
                          ) : (replies[c.id] || []).length === 0 ? (
                            <p className="text-xs text-muted-foreground mb-3">No replies yet. Be the first to support.</p>
                          ) : (
                            <div className="space-y-3 mb-4">
                              {(replies[c.id] || []).map(rp => (
                                <div key={rp.id} className="flex gap-2.5">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                                    {rp.anon_id?.replace("Anonymous User #", "").slice(-2)}
                                  </div>
                                  <div className="flex-1 bg-white/5 rounded-xl px-3 py-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-muted-foreground font-medium">{rp.anon_id}</span>
                                      <span className="text-xs text-muted-foreground/60">{timeAgo(rp.created_at)}</span>
                                    </div>
                                    <p className="text-xs text-foreground/80 leading-relaxed">{rp.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reply input */}
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Share a word of support anonymously..."
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              className="flex-1 min-h-[60px] text-xs resize-none bg-white/5 border-border/50 rounded-xl"
                              maxLength={500}
                              onKeyDown={e => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply(c.id);
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleReply(c.id)}
                              disabled={replying || !replyText.trim()}
                              className="bg-purple-600 hover:bg-purple-700 self-end px-3"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Post modal */}
      <AnimatePresence>
        {postOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setPostOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="fixed z-50 inset-x-4 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-auto md:w-full md:max-w-xl bg-card rounded-t-3xl md:rounded-2xl border border-border shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Share a Secret Confession</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Completely anonymous — we never link this to you
                  </p>
                </div>
                <button onClick={() => setPostOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Category selector */}
              <div className="flex gap-2 flex-wrap mb-4">
                {POST_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setPostCategory(cat)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      postCategory === cat
                        ? (CATEGORY_COLORS[cat] || "bg-purple-600 text-white border-transparent")
                        : "bg-transparent text-muted-foreground border-border/50 hover:border-border"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <Textarea
                ref={textareaRef}
                placeholder="What's weighing on your mind? This is a safe space — no one will know it's you..."
                value={postText}
                onChange={e => setPostText(e.target.value)}
                className="min-h-[140px] resize-none bg-white/5 border-border/50 rounded-xl text-sm mb-2"
                maxLength={1000}
              />
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-muted-foreground">
                  {postText.length}/1000 characters
                </span>
                <span className="text-xs text-muted-foreground">Category: <span className="text-foreground">{postCategory}</span></span>
              </div>

              <Button
                onClick={handlePost}
                disabled={posting || postText.trim().length < 10}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold h-11 rounded-xl"
              >
                {posting ? "Posting..." : "Post Anonymously 🤫"}
              </Button>

              <p className="text-center text-xs text-muted-foreground mt-3">
                By posting you agree to keep this space safe & supportive. Hate speech, personal info, and threats are auto-removed.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer space */}
      <div className="h-16" />
    </div>
  );
}

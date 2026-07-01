import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bookmark, Lock, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClaritySession } from "@/lib/clarity-content";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import creatorImg from "@/assets/lora-silver-VJVsRSjYS4A-unsplash.jpg";

type ContentPreviewModalProps = {
  session: ClaritySession | null;
  onClose: () => void;
};

export const ContentPreviewModal = ({ session, onClose }: ContentPreviewModalProps) => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  useEffect(() => {
    if (!session) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [session, onClose]);

  if (!session) return null;

  const canPlay = (!session.premium || (!!user && isPremium)) && (session.video_url || session.audio_url);

  return (
    <AnimatePresence>
      {session && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.button
            type="button"
            className="fixed inset-0 bg-black/90 backdrop-blur-md"
            aria-label="Close preview"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
            className="relative w-full max-w-5xl mx-auto my-0 md:my-8 z-10"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: real video player, audio player, or cinematic cover */}
            <div className="relative aspect-video md:aspect-[21/9] w-full overflow-hidden rounded-none md:rounded-t-xl bg-black">
              {canPlay && session.video_url ? (
                <video
                  src={session.video_url}
                  controls
                  autoPlay
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                />
              ) : (
                <>
                  <img
                    src={session.cover_url || creatorImg}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${session.accent}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(215_90%_62%/0.35),transparent_60%)]" />
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full glass flex items-center justify-center text-foreground hover:bg-primary/20 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {!(canPlay && session.video_url) && (
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                  {session.premium && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider mb-3">
                      <Sparkles className="w-3 h-3" />
                      Premium
                    </span>
                  )}
                  <h2
                    id="preview-title"
                    className="font-display text-3xl md:text-5xl font-light text-white mb-2"
                  >
                    {session.title}
                  </h2>
                  <p className="text-sm md:text-base text-white/70 max-w-2xl">{session.subtitle}</p>
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div className="bg-[hsl(222_39%_6%)] border border-white/10 md:rounded-b-xl p-6 md:p-10 shadow-elegant">
              {canPlay && session.video_url && (
                <>
                  <h2 className="font-display text-2xl md:text-3xl font-light mb-2">{session.title}</h2>
                  <p className="text-sm text-muted-foreground mb-6">{session.subtitle}</p>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
                <span className="text-primary font-medium">{session.duration}</span>
                <span className="text-white/20">|</span>
                <span className="uppercase tracking-wider text-xs">{session.category}</span>
                <span className="text-white/20">|</span>
                <span className="capitalize">{session.type}</span>
              </div>

              {/* Real audio player, inline (no video to show full-bleed) */}
              {canPlay && session.audio_url && !session.video_url && (
                <audio src={session.audio_url} controls autoPlay className="w-full mb-6" />
              )}

              {!canPlay && (session.video_url || session.audio_url) && (
                <p className="text-muted-foreground leading-relaxed max-w-3xl mb-8">
                  {session.premium
                    ? "This is a Premium session. Unlock full access to watch or listen."
                    : "Sign in to access this session."}
                </p>
              )}

              {!session.video_url && !session.audio_url && (
                <p className="text-muted-foreground leading-relaxed max-w-3xl mb-8">
                  {session.subtitle || "No media file is attached to this session yet."}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                {!canPlay && (session.video_url || session.audio_url) && (
                  <Button asChild variant="hero" size="lg" className="gap-2">
                    <Link to={session.premium && !user ? "/login" : "/pricing"}>
                      <Lock className="w-4 h-4" />
                      {session.premium ? "Get Premium Access" : "Sign in to watch"}
                    </Link>
                  </Button>
                )}
                <Button variant="glass" size="lg" className="gap-2">
                  <Bookmark className="w-4 h-4" />
                  Save Session
                </Button>
                <Button variant="ghost" size="lg" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

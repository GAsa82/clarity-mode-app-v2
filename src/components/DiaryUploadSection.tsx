import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, ArrowRight, X, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DiaryUploader } from "@/components/admin/diary/DiaryUploader";

/**
 * "Diary Upload" — the one-click entry point on the home page.
 *
 * Admin-only and rendered as nothing at all for everyone else: this is the
 * owner's private diary, so a visitor must not even learn the feature exists.
 */
export const DiaryUploadSection = () => {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user || !isAdmin) return null;

  return (
    <section id="diary-upload" className="py-16 md:py-24 relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl border border-primary/20 bg-card-elevated overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(215_90%_62%/0.15),transparent_60%)] pointer-events-none" />

          <div className="relative p-6 md:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass mb-4">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-primary">
                    Private · Admin only
                  </span>
                </div>

                <h2 className="font-display text-3xl md:text-4xl font-light leading-tight mb-3">
                  <Brain className="inline w-7 h-7 text-primary mr-2 -mt-1" />
                  Diary Upload
                </h2>
                <p className="text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed mb-6">
                  Photograph a page from your notebook and drop it here. It gets read, understood,
                  written up, illustrated and filed automatically — uploading is the only step you
                  take.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition"
                  >
                    <Brain className="w-4 h-4" />
                    Diary Upload
                  </button>
                  <Link
                    to="/admin/diary"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl glass text-sm font-medium hover:bg-primary/10 transition"
                  >
                    Open the Diary
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <ol className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5 lg:w-80">
                {[
                  "Reads the handwriting",
                  "Understands the ideas",
                  "Writes SEO metadata",
                  "Designs thumbnails",
                  "Builds research material",
                  "Files it in the right place",
                ].map((step, i) => (
                  <li
                    key={step}
                    className="flex items-start gap-2 rounded-xl border border-border bg-background/40 p-2.5"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[11px] leading-snug text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative w-full max-w-2xl my-8 rounded-2xl border border-border bg-card shadow-elegant overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div>
                  <h3 className="font-display text-lg">Diary Upload</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Everything after the upload runs on its own
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                <DiaryUploader onUploaded={() => {}} />
              </div>

              <div className="px-5 py-3.5 border-t border-border flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  Pages stay private. Anything published lands as a draft for you to review.
                </p>
                <Link
                  to="/admin/diary"
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

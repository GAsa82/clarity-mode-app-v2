import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { getMotivationalMessage } from "@/lib/focus-streak";

type MotivationalPopupProps = {
  running: boolean;
  phase: "focus" | "break";
};

export const MotivationalPopup = ({ running, phase }: MotivationalPopupProps) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  // Track idle time (no activity = running is false for a while)
  const [idleCounter, setIdleCounter] = useState(0);

  useEffect(() => {
    if (!running) {
      const timer = setTimeout(() => {
        setIdleCounter((c) => c + 1);
      }, 15000);
      return () => clearTimeout(timer);
    } else {
      setIdleCounter(0);
    }
  }, [running]);

  // Show motivational popup after 30 seconds of inactivity
  useEffect(() => {
    if (idleCounter >= 2 && !running && phase === "focus") {
      setMessage(getMotivationalMessage());
      setVisible(true);
      setIdleCounter(0);
    }
  }, [idleCounter, running, phase]);

  // Also show on session completion
  useEffect(() => {
    if (!running && phase === "break") {
      const timer = setTimeout(() => {
        setMessage(getMotivationalMessage());
        setVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, running]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[340px] max-w-[calc(100vw-2rem)]"
        >
          <div className="relative rounded-2xl bg-card-elevated border border-primary/20 shadow-glow p-5 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(215_90%_62%/0.12),transparent_60%)]" />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">
                    Clarity Moment
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setVisible(false)}
                  className="p-1 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed font-light italic">
                "{message}"
              </p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setVisible(false)}
                className="mt-3 text-[10px] text-primary hover:underline"
              >
                Dismiss
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
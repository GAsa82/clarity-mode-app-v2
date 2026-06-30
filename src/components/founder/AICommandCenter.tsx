import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowUp, Zap, Cpu, ArrowUpRight } from "lucide-react";
import type { Website } from "@/contexts/WebsiteContext";
import { routeCommand, COMMAND_SUGGESTIONS, type CommandResult, type CommandAction } from "@/lib/founder-ai";

interface Props {
  site: Website | null;
  onAudit: () => void;
  onReport: () => void;
  onSwitch?: () => void;
}

export function AICommandCenter({ site, onAudit, onReport, onSwitch }: Props) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [thinking, setThinking] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const run = (text: string) => {
    const cmd = text.trim();
    if (!cmd) return;
    setThinking(true);
    setResult(null);
    // Brief "processing" beat for a Jarvis-like feel; resolution is deterministic.
    setTimeout(() => {
      setResult(routeCommand(cmd, site));
      setThinking(false);
    }, 420);
  };

  const handleAction = (a: CommandAction) => {
    switch (a.kind) {
      case "navigate":
        navigate(a.to);
        break;
      case "audit":
        onAudit();
        break;
      case "report":
        onReport();
        break;
      case "switch":
        onSwitch?.();
        break;
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="rounded-3xl p-6 md:p-7 relative overflow-hidden"
      style={{
        background: "linear-gradient(150deg, rgba(99,102,241,0.10), rgba(139,92,246,0.04) 60%, rgba(255,255,255,0.02))",
        border: "1px solid rgba(99,102,241,0.22)",
      }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute -top-20 left-1/3 w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.20), transparent 70%)" }}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <div className="relative flex items-center gap-2.5 mb-5">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.2)" }}>
            <Cpu className="w-4.5 h-4.5 text-primary" strokeWidth={1.5} />
          </div>
          <motion.span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-light text-white flex items-center gap-2">
            AI Command Center
            <span className="text-[9px] uppercase tracking-[0.2em] text-primary/70 px-1.5 py-0.5 rounded-md" style={{ background: "rgba(99,102,241,0.12)" }}>
              Jarvis
            </span>
          </h2>
          <p className="text-[11px] text-white/40">Tell the system what to do — in plain English.</p>
        </div>
      </div>

      {/* Command input */}
      <div
        className="relative flex items-center gap-2 rounded-2xl px-4 py-3 transition-all"
        style={{ background: "rgba(8,6,20,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <Sparkles className="w-4 h-4 text-primary/70 shrink-0" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (run(input), setInput(""))}
          placeholder="Audit website · Optimize SEO · Create content…"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
        <kbd className="hidden sm:inline-block text-[10px] text-white/30 px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
        <button
          onClick={() => { run(input); setInput(""); }}
          disabled={!input.trim()}
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
          style={{ background: "rgba(99,102,241,0.25)" }}
          aria-label="Run command"
        >
          <ArrowUp className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* Suggestions */}
      <div className="relative flex flex-wrap gap-2 mt-3">
        {COMMAND_SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => run(s)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] text-white/55 hover:text-white border border-white/8 hover:border-primary/30 transition-all"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <Zap className="w-3 h-3 text-primary/60" />
            {s}
          </button>
        ))}
      </div>

      {/* Response */}
      <AnimatePresence mode="wait">
        {thinking && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative mt-4 flex items-center gap-2 text-sm text-white/50"
          >
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </span>
            Processing command…
          </motion.div>
        )}

        {result && !thinking && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative mt-4 rounded-2xl p-4"
            style={{ background: "rgba(8,6,20,0.55)", border: "1px solid rgba(99,102,241,0.18)" }}
          >
            <p className="text-sm font-medium text-white mb-1">{result.title}</p>
            <p className="text-[13px] text-white/55 leading-relaxed">{result.message}</p>
            {result.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {result.actions.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => handleAction(a)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-primary hover:text-white border border-primary/25 hover:border-primary/50 transition-all"
                    style={{ background: "rgba(99,102,241,0.1)" }}
                  >
                    {a.label}
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

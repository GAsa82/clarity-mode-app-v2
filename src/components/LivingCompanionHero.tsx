import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Mic, ArrowRight, Sparkles, Send, Share2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LivingCompanion, type CompanionMood } from "@/components/LivingCompanion";
import { ClarityShareCard } from "@/components/ClarityShareCard";
import { useClarityStreak } from "@/hooks/useClarityStreak";

/* ------------------------------------------------------------------ */
/* Concern data — each option shifts the companion + the atmosphere    */
/* ------------------------------------------------------------------ */
type Concern = {
  id: string;
  label: string;
  reply: string;
  clarity: string; // the shareable one-liner
  glow: string; // mood color (hsl)
};

const CONCERNS: Concern[] = [
  {
    id: "career",
    label: "Career confusion",
    reply: "Career fog is heavy. You don't need the whole map — just the one thread worth pulling first.",
    clarity: "You don't need the whole map. Just the next honest step.",
    glow: "hsl(215 90% 50%)",
  },
  {
    id: "overthinking",
    label: "Overthinking",
    reply: "Your mind's been running laps. Let's slow it to a walk — I'll stay beside you the whole way.",
    clarity: "A racing mind isn't broken. It just needs a slower road.",
    glow: "hsl(265 70% 58%)",
  },
  {
    id: "money",
    label: "Money worries",
    reply: "Money stress sits right in the chest. Let's turn the noise into one calm, doable move.",
    clarity: "Turn the noise into one next step you can actually take.",
    glow: "hsl(190 75% 45%)",
  },
  {
    id: "relationship",
    label: "Relationship stress",
    reply: "The people we love can be the hardest weather. I'm here with you while it passes.",
    clarity: "Some storms are about someone you love. You can still find shelter.",
    glow: "hsl(330 60% 55%)",
  },
  {
    id: "burnout",
    label: "Burnout",
    reply: "You've been strong for a long time. Let's let something be gentle, just for now.",
    clarity: "You've carried it long enough. Rest is part of the work.",
    glow: "hsl(28 80% 52%)",
  },
  {
    id: "focus",
    label: "Lack of focus",
    reply: "Too many open tabs in your head. Let's close all but one. Only your next step matters.",
    clarity: "Let's focus only on your next step.",
    glow: "hsl(210 95% 55%)",
  },
  {
    id: "self-doubt",
    label: "Self-doubt",
    reply: "That voice isn't the truth — it's just loud. Let's quiet it down together.",
    clarity: "The doubt is loud. That doesn't make it true.",
    glow: "hsl(255 65% 60%)",
  },
  {
    id: "other",
    label: "Something else",
    reply: "Whatever it is, you can set it down right here. I'm listening, and I'm not going anywhere.",
    clarity: "You can set it down here. You don't have to carry it alone.",
    glow: "hsl(215 80% 55%)",
  },
];

const INTRO_LINES = [
  "Hey… you look like you've been carrying a lot lately.",
  "You don't have to untangle everything alone.",
  "Tell me what's on your mind.",
];

/* ------------------------------------------------------------------ */
/* Typewriter — types an array of lines, keeps prior lines visible     */
/* ------------------------------------------------------------------ */
const TypeLines = ({
  lines,
  onDone,
  speed = 32,
}: {
  lines: string[];
  onDone?: () => void;
  speed?: number;
}) => {
  const reduce = useReducedMotion();
  const [done, setDone] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const idx = useRef(0);
  const char = useRef(0);

  useEffect(() => {
    if (reduce) {
      setDone(lines);
      onDone?.();
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const line = lines[idx.current];
      if (line === undefined) {
        onDone?.();
        return;
      }
      if (char.current <= line.length) {
        setCurrent(line.slice(0, char.current));
        char.current += 1;
        timer = setTimeout(tick, speed);
      } else {
        setDone((d) => [...d, line]);
        setCurrent("");
        idx.current += 1;
        char.current = 0;
        timer = setTimeout(tick, 850); // pause between lines
      }
    };
    timer = setTimeout(tick, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  return (
    <div className="space-y-2">
      {done.map((l, i) => (
        <p
          key={i}
          className={
            i === lines.length - 1
              ? "font-display text-2xl md:text-3xl text-silver leading-snug"
              : "text-base md:text-lg text-muted-foreground/80 leading-relaxed"
          }
        >
          {l}
        </p>
      ))}
      {current && (
        <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
          {current}
          <span className="inline-block w-[2px] h-[1.1em] align-middle bg-primary ml-0.5 animate-glow-pulse" />
        </p>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Ambient particles                                                   */
/* ------------------------------------------------------------------ */
const Particles = () => {
  const reduce = useReducedMotion();
  const dots = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1.5 + Math.random() * 3,
        dur: 6 + Math.random() * 8,
        delay: Math.random() * 6,
      })),
    []
  );
  if (reduce) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {dots.map((d) => (
        <motion.span
          key={d.id}
          className="absolute rounded-full bg-primary/60"
          style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size }}
          animate={{ y: [0, -28, 0], opacity: [0, 0.7, 0], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main hero                                                           */
/* ------------------------------------------------------------------ */
export const LivingCompanionHero = () => {
  const reduce = useReducedMotion();
  const [introDone, setIntroDone] = useState(false);
  const [mood, setMood] = useState<CompanionMood>("idle");
  const [active, setActive] = useState<Concern | null>(null);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { streak, moments, label, stage, justReturned, addMoment } = useClarityStreak();

  // wave on load, then settle into a "listening" posture once greeting ends
  useEffect(() => {
    if (introDone) {
      setMood("listening");
    }
  }, [introDone]);

  const respond = (c: Concern) => {
    setActive(c);
    setInput("");
    addMoment();
    // look away to "think", then warm empathy, then a gentle smile
    setMood("thinking");
    window.setTimeout(() => setMood("empathy"), 900);
    window.setTimeout(() => setMood("happy"), 2600);
  };

  const handleFreeform = () => {
    const text = input.trim();
    if (!text) return;
    respond({
      id: "freeform",
      label: text,
      reply:
        "Thank you for trusting me with that. We don't have to solve all of it tonight — just the next small step, together.",
      clarity: "You don't need every answer. You only need the next step.",
      glow: "hsl(215 85% 55%)",
    });
  };

  // Web Speech API — progressive enhancement (no paid infra)
  const toggleMic = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      // graceful fallback — focus the field so they can type
      document.getElementById("companion-input")?.focus();
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setInput(transcript);
    };
    rec.onend = () => {
      setListening(false);
      setMood("listening");
    };
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    setMood("listening");
    rec.start();
  };

  return (
    <section className="relative min-h-[100svh] flex items-center pt-28 pb-20 md:pt-32 overflow-hidden">
      {/* cinematic fade-from-black on first paint */}
      {!reduce && (
        <motion.div
          className="absolute inset-0 z-30 bg-background pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
      )}

      <div className="absolute inset-0 bg-hero pointer-events-none opacity-90" aria-hidden />

      {/* mood atmosphere — crossfades when a concern is chosen */}
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.id}
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{
              background: `radial-gradient(ellipse 70% 60% at 30% 40%, ${active.glow.replace(
                ")",
                " / 0.22)"
              )}, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      <Particles />

      <div className="container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-10 lg:gap-16 items-center">
          {/* ---- Companion ---- */}
          <motion.div
            className="relative mx-auto w-[260px] sm:w-[320px]"
            initial={reduce ? false : { opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* magic moment — scattered thoughts converge & calm when a concern is chosen */}
            <AnimatePresence>
              {active && !reduce && (
                <div key={active.id} className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 9 }).map((_, i) => {
                    const angle = (i / 9) * Math.PI * 2;
                    const from = { x: Math.cos(angle) * 150, y: Math.sin(angle) * 150 };
                    return (
                      <motion.span
                        key={i}
                        className="absolute left-1/2 top-1/2 rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          background: active.glow,
                          boxShadow: `0 0 12px ${active.glow}`,
                        }}
                        initial={{ x: from.x, y: from.y, opacity: 0, scale: 1.4 }}
                        animate={{
                          x: [from.x, from.x * 0.4, 0],
                          y: [from.y, from.y * 0.4, -8],
                          opacity: [0, 0.9, 0],
                          scale: [1.4, 1, 0.4],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2.6, delay: i * 0.08, ease: "easeInOut" }}
                      />
                    );
                  })}
                </div>
              )}
            </AnimatePresence>

            <LivingCompanion mood={mood} wave stage={stage.level} className="w-full h-auto" />
          </motion.div>

          {/* ---- Conversation ---- */}
          <div className="max-w-xl">
            <motion.div
              className="flex flex-wrap items-center gap-2 mb-6"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs tracking-wide text-muted-foreground">
                  Your Clarity companion · no sign-up to begin
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30">
                <Flame className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">{label}</span>
              </span>
            </motion.div>
            {justReturned && (
              <motion.p
                initial={reduce ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="text-xs text-primary/80 mb-4 -mt-2"
              >
                Welcome back — that's {streak} {streak === 1 ? "day" : "days"} together.
                {moments > 0 && ` ${moments} clarity moments so far.`}
              </motion.p>
            )}

            {/* greeting (or the companion's tailored reply) */}
            <div className="min-h-[150px]">
              {!active ? (
                <TypeLines lines={INTRO_LINES} onDone={() => setIntroDone(true)} />
              ) : (
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="space-y-4"
                >
                  <p className="font-display text-2xl md:text-3xl text-silver leading-snug">
                    {active.reply}
                  </p>
                  <div className="rounded-2xl bg-card-elevated border border-border p-5">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-primary mb-2">
                      Today's Clarity
                    </p>
                    <p className="font-display text-lg text-foreground/90 italic mb-4">
                      "{active.clarity}"
                    </p>
                    <button
                      onClick={() => setShareOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 text-primary text-sm hover:bg-primary/25 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share this clarity
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* input + mic + chips appear after the greeting finishes */}
            <AnimatePresence>
              {introDone && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="mt-6"
                >
                  {/* voice / text bar */}
                  <div className="flex items-center gap-2 rounded-full glass p-1.5 pl-2">
                    <button
                      onClick={toggleMic}
                      aria-label="Speak to your companion"
                      className={`relative shrink-0 w-11 h-11 rounded-full grid place-items-center transition-colors ${
                        listening ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                      }`}
                    >
                      {listening && (
                        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                      )}
                      <Mic className="w-5 h-5 relative" />
                    </button>
                    <input
                      id="companion-input"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleFreeform()}
                      placeholder={listening ? "Listening…" : "Tell me what's on your mind…"}
                      className="flex-1 bg-transparent outline-none text-sm md:text-base px-2 placeholder:text-muted-foreground/60"
                    />
                    <button
                      onClick={handleFreeform}
                      aria-label="Send"
                      className="shrink-0 w-10 h-10 rounded-full grid place-items-center bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                  {/* concern chips */}
                  <div className="mt-5">
                    <p className="text-xs text-muted-foreground/70 mb-3">
                      Or just tap what's been occupying your mind lately:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CONCERNS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => respond(c)}
                          className={`px-4 py-2 rounded-full text-sm border transition-all duration-300 ${
                            active?.id === c.id
                              ? "bg-primary/20 border-primary text-foreground"
                              : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CTA — appears once they've engaged */}
                  <AnimatePresence>
                    {active && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.6 }}
                        className="mt-7 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                      >
                        <Button asChild variant="hero" size="xl" className="group">
                          <Link to="/login">
                            Continue with Clarity
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </Link>
                        </Button>
                        <span className="text-xs text-muted-foreground/70">
                          Your companion remembers. Pick up right where you left off.
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* quiet social proof */}
            <motion.div
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
            >
              <span>23,000+ clarity moments</span>
              <span className="opacity-30">·</span>
              <span>40+ countries</span>
              <span className="opacity-30">·</span>
              <span>Be one of our first 100 Pioneers</span>
            </motion.div>
          </div>
        </div>
      </div>

      <ClarityShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        quote={active?.clarity ?? "You don't need every answer. You only need the next step."}
        glow={active?.glow ?? "hsl(215 85% 55%)"}
        streakLabel={label}
      />
    </section>
  );
};

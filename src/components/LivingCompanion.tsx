import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

export type CompanionMood = "idle" | "listening" | "thinking" | "happy" | "empathy";

interface LivingCompanionProps {
  mood?: CompanionMood;
  /** plays the welcome wave once when true */
  wave?: boolean;
  /** evolution stage 0-4, driven by the user's streak */
  stage?: number;
  className?: string;
}

/**
 * A purely SVG, dependency-free "living" companion.
 * It breathes, blinks every 3-6s, follows the cursor with its eyes,
 * tilts its head while listening, looks away while thinking, smiles
 * when happy, and brings a hand to its chest for empathy.
 *
 * All motion is interpolated with springs and respects reduced-motion.
 */
export const LivingCompanion = ({
  mood = "idle",
  wave = false,
  stage = 0,
  className,
}: LivingCompanionProps) => {
  const reduce = useReducedMotion();
  const legendary = stage >= 4;

  // ---- Eye / cursor tracking -------------------------------------------
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const eyeX = useSpring(rawX, { stiffness: 120, damping: 18, mass: 0.6 });
  const eyeY = useSpring(rawY, { stiffness: 120, damping: 18, mass: 0.6 });
  const rootRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = rootRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.42;
        const dx = (e.clientX - cx) / (window.innerWidth / 2);
        const dy = (e.clientY - cy) / (window.innerHeight / 2);
        // when thinking, the gaze drifts up & away instead of tracking
        if (mood === "thinking") {
          rawX.set(-5);
          rawY.set(-6);
        } else {
          rawX.set(Math.max(-6, Math.min(6, dx * 6)));
          rawY.set(Math.max(-4, Math.min(4, dy * 4)));
        }
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [mood, reduce, rawX, rawY]);

  // when thinking, force gaze away even without mouse movement
  useEffect(() => {
    if (mood === "thinking") {
      rawX.set(-5);
      rawY.set(-6);
    }
  }, [mood, rawX, rawY]);

  // ---- Blink -----------------------------------------------------------
  const blink = useMotionValue(1); // 1 = open, 0 = closed
  useEffect(() => {
    if (reduce) return;
    let timeout: ReturnType<typeof setTimeout>;
    let raf = 0;
    const doBlink = () => {
      const start = performance.now();
      const dur = 140;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        // close then open (triangle)
        const v = t < 0.5 ? 1 - t * 2 : (t - 0.5) * 2;
        blink.set(v);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      timeout = setTimeout(doBlink, 3000 + Math.random() * 3000);
    };
    timeout = setTimeout(doBlink, 1200);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [blink, reduce]);

  const lidScaleY = useTransform(blink, [0, 1], [0.05, 1]);

  // ---- Mouth (neutral <-> smile) --------------------------------------
  const smile = useMotionValue(0.35);
  useEffect(() => {
    const target =
      mood === "happy" ? 1 : mood === "empathy" ? 0.55 : mood === "thinking" ? 0.15 : 0.4;
    const start = smile.get();
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 500);
      const eased = 1 - Math.pow(1 - t, 3);
      smile.set(start + (target - start) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mood, smile]);

  const mouthPath = useTransform(smile, (s) => {
    const cx = 110;
    const y = 150;
    const width = 26;
    const curve = -2 + s * 22; // negative dips, positive smiles
    return `M ${cx - width} ${y} Q ${cx} ${y + curve} ${cx + width} ${y}`;
  });

  // ---- Head tilt -------------------------------------------------------
  const headRotate =
    mood === "listening" ? -6 : mood === "thinking" ? 5 : mood === "empathy" ? -3 : 0;

  // ---- Arm: wave on load / hand-to-chest on empathy --------------------
  const waving = wave && !reduce;
  const armToChest = mood === "empathy";

  return (
    <motion.svg
      ref={rootRef}
      viewBox="0 0 220 290"
      className={className}
      initial={false}
      animate={
        reduce
          ? {}
          : { y: [0, -8, 0], scale: [1, 1.012, 1] } // breathing + float
      }
      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      style={{ overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <radialGradient id="lc-aura" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="hsl(215 90% 62%)" stopOpacity="0.55" />
          <stop offset="45%" stopColor="hsl(255 70% 60%)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(215 90% 62%)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(220 45% 22%)" />
          <stop offset="100%" stopColor="hsl(222 50% 11%)" />
        </linearGradient>
        <radialGradient id="lc-head" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="hsl(214 40% 30%)" />
          <stop offset="100%" stopColor="hsl(220 48% 16%)" />
        </radialGradient>
        <radialGradient id="lc-legend" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="hsl(45 95% 60%)" stopOpacity="0.45" />
          <stop offset="55%" stopColor="hsl(215 90% 62%)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(45 95% 60%)" stopOpacity="0" />
        </radialGradient>
        <filter id="lc-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* aura */}
      <motion.circle
        cx="110"
        cy="120"
        r="96"
        fill="url(#lc-aura)"
        animate={reduce ? {} : { opacity: [0.5, 0.85, 0.5], scale: [1, 1.06, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "110px 120px" }}
      />

      {/* ---- EVOLUTION (grows with the user's streak) ---- */}
      {legendary && (
        <motion.circle
          cx="110"
          cy="120"
          r="122"
          fill="url(#lc-legend)"
          animate={reduce ? {} : { opacity: [0.45, 0.85, 0.45], scale: [1, 1.08, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "110px 120px" }}
        />
      )}
      {stage >= 2 && (
        <motion.circle
          cx="110"
          cy="120"
          r="106"
          fill="none"
          stroke={legendary ? "hsl(45 95% 65% / 0.5)" : "hsl(215 90% 62% / 0.35)"}
          strokeWidth="1.5"
          strokeDasharray="3 11"
          animate={reduce ? {} : { rotate: -360 }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "110px 120px" }}
        />
      )}
      {stage >= 1 && !reduce && (
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 13, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "110px 120px" }}
        >
          <circle cx="110" cy="22" r="4.5" fill={legendary ? "hsl(45 95% 70%)" : "hsl(215 90% 72%)"} filter="url(#lc-soft)" />
          {legendary && <circle cx="110" cy="218" r="3.5" fill="hsl(215 90% 72%)" filter="url(#lc-soft)" />}
        </motion.g>
      )}
      {stage >= 3 && (
        <motion.ellipse
          cx="110"
          cy="42"
          rx="40"
          ry="9"
          fill="none"
          stroke="hsl(45 95% 70% / 0.75)"
          strokeWidth="3"
          animate={reduce ? {} : { opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* body / hood shoulders */}
      <path
        d="M 44 286 C 44 214 70 188 110 188 C 150 188 176 214 176 286 Z"
        fill="url(#lc-body)"
        stroke="hsl(215 90% 62% / 0.25)"
        strokeWidth="1.5"
      />
      {/* hood rim */}
      <path
        d="M 58 196 C 70 168 150 168 162 196"
        fill="none"
        stroke="hsl(215 90% 62% / 0.35)"
        strokeWidth="2"
      />
      {/* chest glow node */}
      <motion.circle
        cx="110"
        cy="232"
        r="7"
        fill="hsl(215 90% 62%)"
        filter="url(#lc-soft)"
        animate={reduce ? {} : { opacity: armToChest ? [0.6, 1, 0.6] : [0.3, 0.55, 0.3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* HEAD GROUP (tilts) */}
      <motion.g
        animate={{ rotate: headRotate }}
        transition={{ type: "spring", stiffness: 80, damping: 14 }}
        style={{ transformOrigin: "110px 175px" }}
      >
        {/* head */}
        <circle cx="110" cy="108" r="60" fill="url(#lc-head)" stroke="hsl(215 90% 62% / 0.3)" strokeWidth="1.5" />
        {/* hood top */}
        <path
          d="M 52 104 C 52 60 168 60 168 104 C 150 84 70 84 52 104 Z"
          fill="hsl(220 50% 13%)"
          stroke="hsl(215 90% 62% / 0.25)"
          strokeWidth="1.5"
        />

        {/* EYES (pupils track cursor) */}
        <Eye cx={88} cy={110} eyeX={eyeX} eyeY={eyeY} lidScaleY={lidScaleY} />
        <Eye cx={132} cy={110} eyeX={eyeX} eyeY={eyeY} lidScaleY={lidScaleY} />

        {/* cheeks */}
        <circle cx="78" cy="132" r="7" fill="hsl(215 90% 62% / 0.12)" />
        <circle cx="142" cy="132" r="7" fill="hsl(215 90% 62% / 0.12)" />

        {/* mouth */}
        <motion.path
          d={mouthPath}
          fill="none"
          stroke="hsl(210 30% 92%)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </motion.g>

      {/* ARM / HAND — waves on load, rests on chest for empathy */}
      <motion.g
        style={{ transformOrigin: "162px 210px" }}
        initial={false}
        animate={
          armToChest
            ? { rotate: -38, x: -26, y: 6 }
            : waving
              ? { rotate: [0, -26, -8, -26, 0] }
              : { rotate: 0, x: 0, y: 0 }
        }
        transition={
          armToChest
            ? { type: "spring", stiffness: 90, damping: 13 }
            : { duration: 1.6, ease: "easeInOut", delay: 0.3 }
        }
      >
        <path
          d="M 162 206 C 182 206 192 224 188 246"
          fill="none"
          stroke="url(#lc-body)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <circle cx="188" cy="248" r="11" fill="hsl(214 40% 30%)" stroke="hsl(215 90% 62% / 0.3)" strokeWidth="1.5" />
      </motion.g>
    </motion.svg>
  );
};

interface EyeProps {
  cx: number;
  cy: number;
  eyeX: MotionValue<number>;
  eyeY: MotionValue<number>;
  lidScaleY: MotionValue<number>;
}

const Eye = ({ cx, cy, eyeX, eyeY, lidScaleY }: EyeProps) => (
  <g>
    {/* sclera */}
    <ellipse cx={cx} cy={cy} rx={10} ry={12} fill="hsl(210 35% 94%)" />
    {/* pupil tracks cursor */}
    <motion.g style={{ x: eyeX, y: eyeY }}>
      <circle cx={cx} cy={cy} r={5} fill="hsl(220 60% 14%)" />
      <circle cx={cx + 1.6} cy={cy - 1.6} r={1.6} fill="hsl(210 40% 96%)" />
      <circle cx={cx} cy={cy} r={6.5} fill="none" stroke="hsl(215 90% 62% / 0.5)" strokeWidth="1" />
    </motion.g>
    {/* eyelid — scales down to blink */}
    <motion.rect
      x={cx - 11}
      y={cy - 13}
      width={22}
      height={13}
      rx={6}
      fill="url(#lc-head)"
      style={{ scaleY: lidScaleY, transformOrigin: `${cx}px ${cy - 13}px` }}
    />
  </g>
);

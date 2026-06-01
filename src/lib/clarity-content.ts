export type SessionType = "video" | "audio" | "article";

export type ClaritySession = {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  category: string;
  type: SessionType;
  premium: boolean;
  gumroadUrl: string;
  accent: string;
  featured?: boolean;
};

const gumroad = (slug: string) => `https://gauravdata.gumroad.com/l/${slug}`;

export const featuredSession: ClaritySession = {
  id: "stop-rehearsing",
  title: "Stop Rehearsing The Past",
  subtitle: "Train your mind to move forward with clarity.",
  duration: "24 min",
  category: "Mental Clarity",
  type: "video",
  premium: true,
  gumroadUrl: gumroad("stop-rehearsing-past"),
  accent: "from-blue-600/40 via-indigo-900/60 to-slate-950",
  featured: true,
};

const sessions: ClaritySession[] = [
  featuredSession,
  {
    id: "noise-reset",
    title: "10-Minute Noise Reset",
    subtitle: "Calm the mental static before your next move.",
    duration: "10 min",
    category: "Trending",
    type: "audio",
    premium: false,
    gumroadUrl: gumroad("noise-reset"),
    accent: "from-cyan-600/30 to-slate-900",
  },
  {
    id: "dopamine-72",
    title: "72-Hour Dopamine Reset",
    subtitle: "Rewire focus after digital overload.",
    duration: "8 min",
    category: "Dopamine Detox",
    type: "video",
    premium: true,
    gumroadUrl: gumroad("dopamine-72"),
    accent: "from-violet-600/35 to-slate-950",
  },
  {
    id: "confidence-promises",
    title: "Kept Promises Protocol",
    subtitle: "Confidence as a daily practice, not a mood.",
    duration: "5 min",
    category: "Confidence",
    type: "article",
    premium: true,
    gumroadUrl: gumroad("confidence-promises"),
    accent: "from-indigo-500/35 to-slate-900",
  },
  {
    id: "deep-work-stratus",
    title: "Stratus Deep Work",
    subtitle: "Ambient focus field for long sessions.",
    duration: "45 min",
    category: "Focus Protocols",
    type: "audio",
    premium: true,
    gumroadUrl: gumroad("stratus-deep-work"),
    accent: "from-blue-500/30 to-slate-950",
  },
  {
    id: "name-the-feeling",
    title: "Name The Feeling",
    subtitle: "Reduce emotional grip in under five minutes.",
    duration: "3 min",
    category: "Emotional Intelligence",
    type: "article",
    premium: false,
    gumroadUrl: gumroad("name-the-feeling"),
    accent: "from-teal-500/25 to-slate-900",
  },
  {
    id: "discipline-stack",
    title: "Discipline Stack",
    subtitle: "Small rules that compound into self-trust.",
    duration: "12 min",
    category: "Discipline",
    type: "video",
    premium: true,
    gumroadUrl: gumroad("discipline-stack"),
    accent: "from-slate-500/30 to-slate-950",
  },
  {
    id: "sleep-downshift",
    title: "Sleep Downshift",
    subtitle: "Exit the day without carrying the noise.",
    duration: "18 min",
    category: "Sleep Reset",
    type: "audio",
    premium: true,
    gumroadUrl: gumroad("sleep-downshift"),
    accent: "from-indigo-800/40 to-slate-950",
  },
  {
    id: "clarity-primer",
    title: "Morning Clarity Primer",
    subtitle: "Set intention before the feed takes over.",
    duration: "6 min",
    category: "Mental Clarity",
    type: "video",
    premium: false,
    gumroadUrl: gumroad("clarity-primer"),
    accent: "from-sky-500/30 to-slate-900",
  },
  {
    id: "social-confidence",
    title: "Social Confidence Reset",
    subtitle: "Show up grounded in high-stakes moments.",
    duration: "14 min",
    category: "Confidence",
    type: "video",
    premium: true,
    gumroadUrl: gumroad("social-confidence"),
    accent: "from-purple-600/30 to-slate-950",
  },
  {
    id: "scroll-detox",
    title: "Scroll Detox Ritual",
    subtitle: "Break the loop without deleting your life.",
    duration: "9 min",
    category: "Dopamine Detox",
    type: "article",
    premium: true,
    gumroadUrl: gumroad("scroll-detox"),
    accent: "from-fuchsia-600/25 to-slate-900",
  },
  {
    id: "focus-sprint",
    title: "Focus Sprint 25",
    subtitle: "One block. One outcome. No drift.",
    duration: "25 min",
    category: "Focus Protocols",
    type: "audio",
    premium: false,
    gumroadUrl: gumroad("focus-sprint"),
    accent: "from-blue-700/35 to-slate-950",
  },
  {
    id: "empathy-boundary",
    title: "Empathy With Boundaries",
    subtitle: "Care deeply without losing your center.",
    duration: "11 min",
    category: "Emotional Intelligence",
    type: "video",
    premium: true,
    gumroadUrl: gumroad("empathy-boundary"),
    accent: "from-emerald-600/20 to-slate-900",
  },
  {
    id: "evening-discipline",
    title: "Evening Discipline Close",
    subtitle: "End the day with a kept promise.",
    duration: "7 min",
    category: "Discipline",
    type: "audio",
    premium: false,
    gumroadUrl: gumroad("evening-discipline"),
    accent: "from-slate-600/35 to-slate-950",
  },
  {
    id: "midnight-wind-down",
    title: "Midnight Wind Down",
    subtitle: "Slow breath. Slow mind. Deep rest.",
    duration: "22 min",
    category: "Sleep Reset",
    type: "audio",
    premium: true,
    gumroadUrl: gumroad("midnight-wind-down"),
    accent: "from-indigo-900/50 to-black",
  },
  {
    id: "trending-reset",
    title: "Sunday Reset Live",
    subtitle: "Weekly clarity ritual for members.",
    duration: "32 min",
    category: "Trending",
    type: "video",
    premium: true,
    gumroadUrl: gumroad("sunday-reset"),
    accent: "from-primary/30 to-slate-950",
  },
  {
    id: "overthinking-loop",
    title: "Break The Overthinking Loop",
    subtitle: "Pattern interrupt for recurring thoughts.",
    duration: "15 min",
    category: "Mental Clarity",
    type: "video",
    premium: true,
    gumroadUrl: gumroad("overthinking-loop"),
    accent: "from-blue-800/40 to-slate-950",
  },
];

export const contentSections: { title: string; category: string }[] = [
  { title: "Trending Clarity Sessions", category: "Trending" },
  { title: "Mental Clarity", category: "Mental Clarity" },
  { title: "Confidence", category: "Confidence" },
  { title: "Dopamine Detox", category: "Dopamine Detox" },
  { title: "Emotional Intelligence", category: "Emotional Intelligence" },
  { title: "Discipline", category: "Discipline" },
  { title: "Focus Protocols", category: "Focus Protocols" },
  { title: "Sleep Reset", category: "Sleep Reset" },
];

export function getSessionsByCategory(category: string): ClaritySession[] {
  return sessions.filter((s) => s.category === category && !s.featured);
}

export function getSessionById(id: string): ClaritySession | undefined {
  return sessions.find((s) => s.id === id);
}

export { sessions };

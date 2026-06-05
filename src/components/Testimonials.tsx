import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, BadgeCheck, ThumbsUp } from "lucide-react";

const testimonials = [
  {
    quote: "Used to doom-scroll after every JEE session. First week on Clarity and I finished 3 chapters of Organic Chemistry without touching my phone.",
    name: "Arjun M.",
    role: "JEE Aspirant, 19",
    city: "Delhi",
    stars: 5,
    helpful: 47,
    avatar: "AM",
    color: "from-blue-500 to-indigo-600",
  },
  {
    quote: "As a CA Final student I was constantly anxious before exams. The focus rooms helped me study 6 hours straight for the first time in my life.",
    name: "Priya S.",
    role: "CA Final, 23",
    city: "Mumbai",
    stars: 5,
    helpful: 61,
    avatar: "PS",
    color: "from-rose-500 to-pink-600",
  },
  {
    quote: "Running two startups in Bangalore was chaos. Clarity replaced my 11pm Instagram spiral with actual deep work. Shipped 3 features this month.",
    name: "Rohan G.",
    role: "Co-founder, 28",
    city: "Bangalore",
    stars: 5,
    helpful: 83,
    avatar: "RG",
    color: "from-emerald-500 to-teal-600",
  },
  {
    quote: "Cleared CAT with 99.2 percentile. Went from 2 scattered hours to 5 focused hours daily. The body double sessions were a game changer.",
    name: "Ananya K.",
    role: "MBA Student, 25",
    city: "Pune",
    stars: 5,
    helpful: 54,
    avatar: "AK",
    color: "from-violet-500 to-purple-600",
  },
  {
    quote: "The Overthinking Reset is literally made for an Indian brain. I used to analyse every problem from every angle and still do nothing. Now I just start.",
    name: "Ishaan P.",
    role: "Software Engineer, 27",
    city: "Hyderabad",
    stars: 5,
    helpful: 72,
    avatar: "IP",
    color: "from-orange-500 to-amber-600",
  },
  {
    quote: "UPSC prep alone at home was killing me. The focus rooms gave me virtual study partners. Felt like a library without leaving my room.",
    name: "Sneha R.",
    role: "UPSC Aspirant, 24",
    city: "Lucknow",
    stars: 5,
    helpful: 39,
    avatar: "SR",
    color: "from-cyan-500 to-sky-600",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < count ? "text-amber-400" : "text-border"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ t, index }: { t: typeof testimonials[0]; index: number }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(t.helpful);

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setCount(c => c - 1);
    } else {
      setLiked(true);
      setCount(c => c + 1);
    }
  };

  return (
    <motion.figure
      key={index}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="bg-card-elevated border border-border rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/30 transition-colors duration-300 group"
    >
      {/* Top row: avatar + name + verified */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {t.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">{t.name}</p>
            <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          <p className="text-[11px] text-muted-foreground">{t.role} · {t.city}</p>
        </div>
        <StarRating count={t.stars} />
      </div>

      {/* Quote */}
      <blockquote className="text-sm leading-relaxed text-foreground/85 flex-1">
        "{t.quote}"
      </blockquote>

      {/* Helpful button */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground/60">Verified Clarity user</span>
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all ${
            liked
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
          }`}
        >
          <ThumbsUp className="w-3 h-3" />
          {count} helpful
        </button>
      </div>
    </motion.figure>
  );
}

export const Testimonials = () => {
  const [page, setPage] = useState(0);
  const perPage = 3;
  const total = Math.ceil(testimonials.length / perPage);

  const next = useCallback(() => setPage(p => (p + 1) % total), [total]);
  const prev = () => setPage(p => (p - 1 + total) % total);

  // Auto-rotate every 5s
  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  const visible = testimonials.slice(page * perPage, page * perPage + perPage);

  return (
    <section className="py-24 md:py-32 relative">
      <div className="container">
        {/* Header */}
        <div className="flex items-end justify-between mb-16 flex-wrap gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">Voices</p>
            <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
              From the <span className="text-silver italic">quietly transformed.</span>
            </h2>
          </div>

          {/* Nav arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cards */}
        <AnimatePresence mode="wait">
          <div key={page} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visible.map((t, i) => (
              <TestimonialCard key={`${page}-${i}`} t={t} index={i} />
            ))}
          </div>
        </AnimatePresence>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`rounded-full transition-all duration-300 ${
                i === page ? "w-6 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border hover:bg-primary/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

import {
  Sparkles,
  Brain,
  Heart,
  TrendingUp,
  Lightbulb,
  Shield,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Zap,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppChat } from "@/components/WhatsAppChat";

const INSIGHTS = [
  {
    category: "Decision-Making",
    icon: Brain,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    insight:
      "Research shows that most bad decisions come from reacting to the present moment rather than your values. Clarifying your criteria before a decision reduces regret by over 60%.",
    source: "Kahneman, Thinking Fast and Slow",
  },
  {
    category: "Focus",
    icon: Target,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    insight:
      "Deep work sessions of 90 minutes align with the brain's ultradian rhythm. Working in sync with this cycle produces output equal to 4+ hours of scattered effort.",
    source: "Newport, Deep Work",
  },
  {
    category: "Emotional Control",
    icon: Heart,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    insight:
      "Naming an emotion reduces its intensity by activating the prefrontal cortex. The simple act of labelling 'anger' or 'anxiety' creates measurable distance from the feeling.",
    source: "Lieberman et al., Putting Feelings Into Words",
  },
  {
    category: "Productivity",
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    insight:
      "The two-minute rule is backed by implementation intention research: if a task takes under two minutes, doing it immediately uses less cognitive load than scheduling it.",
    source: "Gollwitzer, Implementation Intentions",
  },
  {
    category: "Growth Mindset",
    icon: TrendingUp,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    insight:
      "Deliberate practice — focused, uncomfortable repetition with immediate feedback — produces expertise 3-5x faster than unstructured practice. Effort matters; randomness does not.",
    source: "Ericsson, Peak",
  },
  {
    category: "Mental Clarity",
    icon: Lightbulb,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    insight:
      "Writing by hand forces slower, more deliberate processing than typing. Studies show handwritten notes improve conceptual understanding and long-term recall significantly.",
    source: "Mueller & Oppenheimer, The Pen Is Mightier",
  },
];

const PRINCIPLES = [
  "Clarity is a skill, not a trait — it can be practised and improved.",
  "Most overthinking is a problem of incomplete information, not weak will.",
  "Your best decisions come from values, not moods.",
  "Rest is not the absence of work — it is preparation for better work.",
  "Compound growth in understanding beats short bursts of motivation.",
];

export default function InsightsPage() {
  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />

      <div className="pt-28 pb-12 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              <BookOpen className="w-4 h-4" />
              Research Insights
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-light leading-tight mb-4">
              Clarity backed by<br />
              <span className="text-gradient italic">science and research.</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Distilled insights from the best research on decision-making, focus, emotional control, and personal growth.
            </p>
          </div>

          {/* Insight cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {INSIGHTS.map((item) => (
              <div
                key={item.category}
                className={`glass rounded-2xl border ${item.border} p-6 hover:border-opacity-60 transition-all duration-300`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} strokeWidth={1.5} />
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${item.color}`}>
                    {item.category}
                  </span>
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed mb-3">
                  {item.insight}
                </p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">
                  Source: {item.source}
                </p>
              </div>
            ))}
          </div>

          {/* Principles */}
          <div className="glass rounded-2xl border border-border p-8 mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl font-light">Core Principles</h2>
            </div>
            <ul className="space-y-4">
              {PRINCIPLES.map((line, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                  <span className="text-primary mt-0.5 shrink-0">—</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA to Research Library */}
          <div className="glass border border-primary/20 rounded-2xl p-8 text-center mb-16">
            <BookOpen className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-display text-xl font-light mb-2">Go deeper</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
              Access the full research library — papers, frameworks, protocols, and templates — in the Knowledge Vault.
            </p>
            <Link
              to="/research"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Browse Research Papers
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Satisfaction Guarantee & Coaching Standards */}
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest mb-4">
                <Shield className="w-3.5 h-3.5" /> Your Investment Is Protected
              </div>
              <h2 className="text-2xl font-bold">
                Satisfaction Guarantee & Coaching Standards
              </h2>
            </div>

            <div className="glass border border-primary/20 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-2">Our Satisfaction Promise</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    We take every session seriously and are committed to delivering genuine value.
                    If you attend the full 120-minute session, actively participate, and genuinely
                    feel you received no value from the coaching experience, you may contact support
                    within 24 hours of the session for a review.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    After review, we may offer a complimentary follow-up session, a partial refund,
                    or a full refund when appropriate. This policy exists to ensure fairness for
                    both the client and the coach.
                  </p>
                  <p className="text-xs text-primary/80 italic">
                    "Your investment is protected by our Satisfaction Promise. We are committed to
                    creating a valuable coaching experience and standing behind the quality of our service."
                  </p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="glass border border-green-500/20 rounded-xl p-5">
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">
                  Eligible For Review
                </p>
                <div className="space-y-2">
                  {[
                    "Client attended the complete session",
                    "Request submitted within 24 hours",
                    "Clear explanation provided",
                  ].map((t) => (
                    <div key={t} className="flex items-center gap-2 text-sm text-foreground/70">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass border border-red-500/20 rounded-xl p-5">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
                  Not Eligible
                </p>
                <div className="space-y-2">
                  {[
                    "Missed appointments",
                    "Late cancellations",
                    "Requests made after 24 hours",
                    "Change of mind after session",
                  ].map((t) => (
                    <div key={t} className="flex items-center gap-2 text-sm text-foreground/70">
                      <span className="w-3.5 h-3.5 rounded-full border border-red-400 flex items-center justify-center shrink-0 text-[9px] text-red-400 font-bold leading-none">✕</span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass border border-white/10 rounded-2xl p-6 text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Ready for a Breakthrough?</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Book a private 1-on-1 session. 120 minutes of focused clarity, a personal action plan, and 7 days of WhatsApp support.
              </p>
              <Link to="/coaching">
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                  See Coaching Sessions
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

        </div>
      </div>

      <Footer />
      <WhatsAppChat />
    </main>
  );
}

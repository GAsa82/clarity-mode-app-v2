import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, Clock, MessageCircle, Users, Zap,
  ChevronDown, Shield, ArrowRight, Calendar, Target,
  Lightbulb, TrendingUp, Brain, Heart, Award
} from "lucide-react";
import { useState } from "react";

const INCLUSIONS = [
  "2-Hour Private Video Coaching Session",
  "Personalized Action Plan",
  "Deep Problem Analysis",
  "Goal Clarification & Direction",
  "Practical Next Steps",
  "Session Summary Notes",
  "WhatsApp Support for 7 Days After Session",
];

const WHO_FOR = [
  { icon: Brain, text: "Career confusion & direction" },
  { icon: Zap, text: "Decision paralysis" },
  { icon: Target, text: "Lack of clarity & focus" },
  { icon: TrendingUp, text: "Business & entrepreneurship roadblocks" },
  { icon: Heart, text: "Motivation & confidence issues" },
  { icon: Lightbulb, text: "Overthinking & mental loops" },
  { icon: Users, text: "Productivity struggles" },
  { icon: Award, text: "Personal growth challenges" },
];

const BENEFITS = [
  "Gain absolute clarity on your biggest challenge",
  "Discover your practical next steps — no fluff",
  "Get brutally honest, personalised feedback",
  "Build unshakeable confidence in your decisions",
  "Leave with a clear roadmap and action plan",
  "7-day accountability support to follow through",
];

const STEPS = [
  { n: "01", title: "Book Your Session", desc: "Pick your preferred date and time. Complete secure payment. Get instant confirmation." },
  { n: "02", title: "Show Up & Go Deep", desc: "Join the 120-minute video call ready to explore your challenge without holding back." },
  { n: "03", title: "Leave With Clarity", desc: "Walk away with a personalised action plan, clear next steps, and 7 days of ongoing support." },
];


const FAQS = [
  {
    q: "What happens after I book and pay?",
    a: "You receive an instant booking confirmation email with your session date, time, and Google Meet link. You'll also receive a WhatsApp welcome message with session prep tips.",
  },
  {
    q: "How do I join the video session?",
    a: "The session is held via Google Meet. The link is sent in your confirmation email. Just click it at your booked time — no app download required.",
  },
  {
    q: "Can I reschedule my session?",
    a: "Yes. Contact support via WhatsApp at least 24 hours before your session to reschedule. Last-minute cancellations or no-shows are not eligible for refunds.",
  },
  {
    q: "What language will the session be in?",
    a: "The session is conducted in English, Hindi, or Hinglish — whichever you're most comfortable with.",
  },
  {
    q: "Do I need to prepare anything?",
    a: "Come with your top challenge written down clearly. Think about what has you stuck and what clarity would look like. The more specific you are, the deeper we can go.",
  },
  {
    q: "How does the 7-day WhatsApp support work?",
    a: "After your session you'll receive check-in messages on Day 0, 1, 3, 5, and 7. You can also reply to ask questions, share progress, or get quick feedback during those 7 days.",
  },
  {
    q: "Is this therapy or coaching?",
    a: "This is coaching — it's action-oriented and forward-focused. We identify where you are, where you want to be, and how to bridge that gap. It is not therapy or clinical mental health support.",
  },
  {
    q: "What is your satisfaction policy?",
    a: "If you attend the full 120-minute session, actively participate, and genuinely feel you received no value, contact support within 24 hours. We'll review your experience and offer a follow-up session, partial refund, or full refund as appropriate.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full text-left border border-white/10 rounded-xl overflow-hidden"
    >
      <div className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
        <span className="font-medium text-sm md:text-base pr-4">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-white/10">
          <p className="pt-4">{a}</p>
        </div>
      )}
    </button>
  );
}

export default function CoachingPage() {
  return (
    <main className="min-h-screen bg-transparent relative z-0 overflow-x-hidden">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest mb-6">
            <Clock className="w-3.5 h-3.5" /> Limited Weekly Slots — High Demand
          </div>

          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Transform Your Life in{" "}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              120 Minutes
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            A private 1-on-1 coaching session that gives you the clarity, direction, and action plan
            you've been searching for — in a single focused conversation.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <Link to="/coaching/book">
              <Button variant="hero" size="lg" className="px-8 gap-2 text-base">
                Book Your Session — ₹3,000
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="glass" size="lg" className="px-8">
                See How It Works
              </Button>
            </a>
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {[
              { icon: Shield, text: "Satisfaction Promise" },
              { icon: Clock, text: "120-Min Deep Session" },
              { icon: MessageCircle, text: "7-Day WhatsApp Support" },
              { icon: Calendar, text: "Flexible Scheduling" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section className="py-12 border-y border-white/10 bg-white/2">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "120", label: "Minutes, Focused" },
              { value: "7", label: "Days Support" },
              { value: "₹3,000", label: "One-Time Investment" },
              { value: "100%", label: "Personalised" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                  {s.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who this is for ──────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Is This{" "}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                For You?
              </span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              This session is designed for people who are done being stuck and ready to move forward.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {WHO_FOR.map(({ icon: Icon, text }) => (
              <div key={text} className="glass border border-white/10 rounded-xl p-5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground/80">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8 italic">
            If any of these describes you, this session was built for exactly where you are right now.
          </p>
        </div>
      </section>

      {/* ── What's included ──────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white/2">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything That's{" "}
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                  Included
                </span>
              </h2>
              <p className="text-muted-foreground mb-8">
                One session. Full commitment. Everything you need to move forward.
              </p>
              <div className="space-y-3">
                {INCLUSIONS.map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider">
                Key Benefits
              </h3>
              {BENEFITS.map((b, i) => (
                <div key={b} className="flex items-start gap-3 p-4 glass border border-white/10 rounded-xl">
                  <span className="text-2xl font-bold text-primary/30 font-display leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm text-foreground/80">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It{" "}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                Works
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map(s => (
              <div key={s.n} className="glass border border-white/10 rounded-2xl p-7 text-center">
                <span className="text-5xl font-bold text-primary/20 font-display block mb-4">{s.n}</span>
                <h3 className="font-semibold text-lg mb-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing card ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white/2">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Your Investment
            </h2>
            <p className="text-muted-foreground">One session. One price. One transformation.</p>
          </div>

          <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-8 text-center shadow-2xl shadow-primary/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wide">
              LIMITED WEEKLY SLOTS
            </div>

            <div className="mb-6 mt-2">
              <span className="text-6xl font-bold">₹3,000</span>
              <p className="text-muted-foreground text-sm mt-1">One-time · No subscription</p>
            </div>

            <div className="space-y-3 mb-8 text-left">
              {[
                { icon: Clock, text: "120-Minute Private Session" },
                { icon: MessageCircle, text: "7-Day WhatsApp Support" },
                { icon: Target, text: "Personalized Action Plan" },
                { icon: Shield, text: "Satisfaction Promise" },
                { icon: Calendar, text: "Your Preferred Date & Time" },
                { icon: Users, text: "1-on-1 with Coach Gaurav" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm">{text}</span>
                </div>
              ))}
            </div>

            <Link to="/coaching/book" className="block">
              <Button variant="hero" size="lg" className="w-full text-base gap-2">
                Book Now — ₹3,000
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>Secure payment via Razorpay · Satisfaction Promise</span>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-muted-foreground">Slots filling up this week</span>
            </div>
          </div>
        </div>
      </section>


      {/* ── Satisfaction guarantee ────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="glass border border-primary/20 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Our Satisfaction Promise</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Your investment is protected. If you attend the full 120-minute session, actively
              participate, and genuinely feel you received no value — contact us within 24 hours.
              We'll offer a follow-up session, partial refund, or full refund as appropriate.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Eligible For Review</p>
                <div className="space-y-1.5">
                  {["Attended full session", "Request within 24 hours", "Clear explanation provided"].map(t => (
                    <div key={t} className="flex items-center gap-2 text-sm text-foreground/70">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Not Eligible</p>
                <div className="space-y-1.5">
                  {["Missed appointment", "Late cancellation", "After 24 hours", "Change of mind post-session"].map(t => (
                    <div key={t} className="flex items-center gap-2 text-sm text-foreground/70">
                      <span className="w-3.5 h-3.5 rounded-full border border-red-400 flex items-center justify-center shrink-0 text-[10px] text-red-400 font-bold">✕</span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white/2">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked{" "}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest mb-6">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Slots Available This Week
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Stop Waiting for Clarity.{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Create It.
            </span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto">
            120 minutes can change the direction of your life. Book your breakthrough session today.
          </p>
          <Link to="/coaching/book">
            <Button variant="hero" size="lg" className="px-10 text-base gap-2">
              Book My Breakthrough Session
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-5">
            Secure payment · Instant confirmation · Satisfaction Promise
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}

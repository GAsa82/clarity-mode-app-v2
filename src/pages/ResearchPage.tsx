import { BookOpen, FileText, ArrowRight, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppChat } from "@/components/WhatsAppChat";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = [
  {
    title: "Decision-Making",
    desc: "Evidence-based frameworks for clearer, faster decisions under uncertainty.",
    count: "12 papers",
    premium: false,
  },
  {
    title: "Focus & Deep Work",
    desc: "Research on attention, flow states, and high-performance concentration.",
    count: "18 papers",
    premium: false,
  },
  {
    title: "Mental Clarity Protocols",
    desc: "Step-by-step protocols to reduce mental noise and think with precision.",
    count: "9 protocols",
    premium: true,
  },
  {
    title: "Productivity Systems",
    desc: "Tested frameworks from behavioural science and performance research.",
    count: "14 frameworks",
    premium: true,
  },
  {
    title: "Emotional Regulation",
    desc: "Science-backed techniques for managing stress, anxiety, and reactivity.",
    count: "11 papers",
    premium: true,
  },
  {
    title: "Personal Growth",
    desc: "Research on habit formation, identity change, and long-term behaviour.",
    count: "16 resources",
    premium: true,
  },
];

export default function ResearchPage() {
  const { user } = useAuth();

  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />

      <div className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto">

          <div className="mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <BookOpen className="w-4 h-4" />
              Research Library
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-light leading-tight mb-4">
              Premium research papers,<br />
              <span className="text-gradient italic">curated for clarity.</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed">
              Access research papers, frameworks, protocols, and templates designed to improve decision-making, focus, productivity, and personal growth.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.title}
                className="group relative bg-card-elevated border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <FileText className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  {cat.premium && !user && (
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      Premium
                    </span>
                  )}
                </div>
                <h3 className="font-display text-lg mb-1.5">{cat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{cat.desc}</p>
                <span className="text-xs text-primary/70">{cat.count}</span>
              </div>
            ))}
          </div>

          {!user && (
            <div className="rounded-2xl bg-card-elevated border border-primary/20 p-8 md:p-12 text-center">
              <h2 className="font-display text-2xl md:text-3xl font-light mb-3">
                Unlock the full research library
              </h2>
              <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto mb-8 leading-relaxed">
                Premium members get full access to every research paper, framework, protocol, and template — plus new drops every week.
              </p>
              <Button asChild variant="hero" size="lg" className="group">
                <Link to="/login">
                  Get Premium Access
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <Footer />
      <WhatsAppChat />
    </main>
  );
}

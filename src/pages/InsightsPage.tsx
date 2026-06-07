import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppChat } from "@/components/WhatsAppChat";
import { PremiumGate } from "@/components/PremiumGate";
import {
  Sparkles,
  TrendingUp,
  Brain,
  Heart,
  BarChart3,
  Calendar,
  Lightbulb,
  Shield,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  getDashboard,
  getPatterns,
  type DashboardStats,
} from "@/lib/clarity-ai-api";

export default function InsightsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patterns, setPatterns] = useState<{
    patterns: { type: string; data: Record<string, number> }[];
    insights: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDashboard(), getPatterns()])
      .then(([s, p]) => {
        setStats(s);
        setPatterns(p);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />

      <PremiumGate feature="AI Insights">
      <div className="pt-28 pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-4">
              <BarChart3 className="w-4 h-4" />
              Insights
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Your{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Emotional Insights
              </span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Discover patterns in your emotional well-being, track growth,
              and gain clarity from your diary entries.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">
                Loading your insights...
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                Unable to load insights
              </p>
              <p className="text-xs text-muted-foreground/70">
                The AI service is temporarily unavailable. Please try again in a moment.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass rounded-xl border border-white/10 p-5">
                  <Calendar className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="text-2xl font-bold">{stats?.total_entries ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total Entries</p>
                </div>
                <div className="glass rounded-xl border border-white/10 p-5">
                  <Heart className="w-5 h-5 text-pink-400 mb-2" />
                  <p className="text-2xl font-bold">
                    {stats?.top_emotions?.[0]?.emotion ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Top Emotion</p>
                </div>
                <div className="glass rounded-xl border border-white/10 p-5">
                  <Lightbulb className="w-5 h-5 text-yellow-400 mb-2" />
                  <p className="text-2xl font-bold">
                    {stats?.top_themes?.[0]?.theme ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Top Theme</p>
                </div>
                <div className="glass rounded-xl border border-white/10 p-5">
                  <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
                  <p className="text-2xl font-bold">{stats?.total_chunks ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Data Points</p>
                </div>
              </div>

              {/* Emotions */}
              {stats?.top_emotions && stats.top_emotions.length > 0 && (
                <div className="glass rounded-xl border border-white/10 p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    Emotional Landscape
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {stats.top_emotions.map((e, i) => (
                      <div
                        key={e.emotion}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
                      >
                        <span className="text-sm font-medium">{e.emotion}</span>
                        <span className="text-xs text-muted-foreground">{e.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Themes */}
              {stats?.top_themes && stats.top_themes.length > 0 && (
                <div className="glass rounded-xl border border-white/10 p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    Recurring Themes
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {stats.top_themes.map((t) => (
                      <div
                        key={t.theme}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
                      >
                        <span className="text-sm font-medium">{t.theme}</span>
                        <span className="text-xs text-muted-foreground">{t.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {patterns?.insights && patterns.insights.length > 0 && (
                <div className="glass rounded-xl border border-white/10 p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI-Generated Insights
                  </h3>
                  <div className="space-y-3">
                    {patterns.insights.map((insight, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/5"
                      >
                        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-foreground/80">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Entries */}
              {stats?.recent_entries && stats.recent_entries.length > 0 && (
                <div className="glass rounded-xl border border-white/10 p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    Recent Entries
                  </h3>
                  <div className="space-y-3">
                    {stats.recent_entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-4 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{entry.filename}</span>
                          <span className="text-xs text-muted-foreground">
                            {entry.uploaded_at}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {entry.text || "No preview available"}
                        </p>
                        {entry.emotions.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {entry.emotions.map((em) => (
                              <span
                                key={em}
                                className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]"
                              >
                                {em}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </PremiumGate>

      {/* ── Satisfaction Guarantee & Trust Indicator ─────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Trust header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest mb-4">
              <Shield className="w-3.5 h-3.5" /> Your Investment Is Protected
            </div>
            <h2 className="text-2xl font-bold">
              Satisfaction Guarantee & Coaching Standards
            </h2>
          </div>

          {/* Guarantee card */}
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

          {/* Refund policy two-column */}
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
                ].map(t => (
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
                ].map(t => (
                  <div key={t} className="flex items-center gap-2 text-sm text-foreground/70">
                    <span className="w-3.5 h-3.5 rounded-full border border-red-400 flex items-center justify-center shrink-0 text-[9px] text-red-400 font-bold leading-none">✕</span>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA to coaching page */}
          <div className="glass border border-white/10 rounded-2xl p-6 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Ready for a Breakthrough?</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Book a private 1-on-1 session with your AI coach. 120 minutes of focused clarity,
              a personal action plan, and 7 days of WhatsApp support.
            </p>
            <Link to="/coaching">
              <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                See Coaching Sessions
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

        </div>
      </section>

      <Footer />
      <WhatsAppChat />
    </main>
  );
}
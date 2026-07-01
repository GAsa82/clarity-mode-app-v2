import { useEffect, useState } from "react";
import { BookOpen, FileText, ArrowRight, Lock, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppChat } from "@/components/WhatsAppChat";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabase";
import { getWebsiteIdBySlug } from "@/lib/site-settings";

type Paper = {
  id: string;
  title: string;
  author: string | null;
  category: string;
  abstract: string | null;
  cover_url: string | null;
  pdf_url: string | null;
  preview_url: string | null;
  visibility: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  decision_making: "Decision-Making",
  focus: "Focus & Deep Work",
  mental_clarity: "Mental Clarity Protocols",
  productivity: "Productivity Systems",
  emotional_regulation: "Emotional Regulation",
  personal_growth: "Personal Growth",
  general: "General",
};

export default function ResearchPage() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const websiteId = await getWebsiteIdBySlug("clarity-mode");
      let query = supabase
        .from("research_papers")
        .select("id, title, author, category, abstract, cover_url, pdf_url, preview_url, visibility")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (websiteId) query = query.eq("website_id", websiteId);
      const { data } = await query;
      setPapers(data ?? []);
      setLoaded(true);
    })();
  }, []);

  const categoryCounts = papers.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  const canRead = (p: Paper) => p.visibility === "public" || (!!user && isPremium);

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

          {/* Category summary — real counts from published papers */}
          {Object.keys(categoryCounts).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <div
                  key={cat}
                  className="group relative bg-card-elevated border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <FileText className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-lg mb-1.5">{CATEGORY_LABELS[cat] ?? cat}</h3>
                  <span className="text-xs text-primary/70">{count} paper{count === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          )}

          {/* Real published papers */}
          {loaded && papers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
              {papers.map((p) => (
                <div
                  key={p.id}
                  className="flex gap-4 bg-card-elevated border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors"
                >
                  {p.cover_url ? (
                    <img src={p.cover_url} alt={p.title} className="w-16 h-20 object-cover rounded-lg shrink-0 bg-secondary" />
                  ) : (
                    <div className="w-16 h-20 rounded-lg bg-secondary shrink-0 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base leading-tight mb-1">{p.title}</p>
                    {p.author && <p className="text-xs text-muted-foreground mb-2">{p.author}</p>}
                    {p.abstract && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{p.abstract}</p>
                    )}
                    {canRead(p) ? (
                      <a
                        href={p.pdf_url ?? p.preview_url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Download className="w-3 h-3" /> Read paper
                      </a>
                    ) : (
                      <Link to="/pricing" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                        <Lock className="w-3 h-3" /> Premium — unlock to read
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : loaded ? (
            <div className="rounded-2xl border border-dashed border-border bg-card-elevated/40 p-12 text-center mb-16">
              <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No research papers published yet.</p>
            </div>
          ) : null}

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

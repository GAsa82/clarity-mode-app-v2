import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppChat } from "@/components/WhatsAppChat";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Heart, Sparkles } from "lucide-react";

export default function About() {
  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />

      <div className="pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              About Clarity Mode
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-light leading-tight mb-6">
              Built for people who <br />
              <span className="text-gradient italic">think too much.</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              Clarity Mode is an AI-powered personal growth platform that helps
              you understand your own mind — through journaling, pattern analysis,
              and honest reflection.
            </p>
          </div>

          <div className="space-y-10 text-foreground/80 leading-relaxed text-base">

            <div id="story" className="glass rounded-2xl border border-border p-8">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-5 h-5 text-primary" />
                <h2 className="font-display text-xl font-light">The Story</h2>
              </div>
              <p className="mb-4">
                Clarity Mode started from a simple frustration: most self-help tools
                give you generic advice. They don't know <em>you</em>. They don't
                know what you've been through, what patterns you keep repeating, or
                what your own words reveal about where you're stuck.
              </p>
              <p>
                So we built something different — an AI coach that reads your diary
                entries, report cards, and personal documents, then reflects your
                own patterns back to you. Not generic wisdom. Your specific story.
              </p>
            </div>

            <div id="manifesto" className="glass rounded-2xl border border-border p-8">
              <div className="flex items-center gap-3 mb-4">
                <Heart className="w-5 h-5 text-pink-400" />
                <h2 className="font-display text-xl font-light">The Manifesto</h2>
              </div>
              <ul className="space-y-3">
                {[
                  "Your mind is not broken. It just needs a mirror.",
                  "Clarity is not the absence of problems — it's the ability to see them clearly.",
                  "Growth happens when you stop performing and start reflecting.",
                  "The goal is not happiness on demand. It's resilience by design.",
                  "You already have the answers. We help you hear them.",
                ].map((line, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-primary mt-1">—</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          <div className="text-center mt-16">
            <Button asChild variant="hero" size="lg" className="group">
              <Link to="/login">
                Start your clarity journey
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

        </div>
      </div>

      <Footer />
      <WhatsAppChat />
    </main>
  );
}
